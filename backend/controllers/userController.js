const db = require('../config/database');
// Firebase dependency removed as per user request for direct database connection

async function ensureUsersTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL,
        profile JSONB DEFAULT '{}'::jsonb,
        other_players JSONB DEFAULT '{}'::jsonb,
        username TEXT,
        password_hash TEXT,
        "mainCharacter" TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check and add columns individually if missing
    const columns = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    const columnNames = columns.rows.map(c => c.column_name);

    if (!columnNames.includes('password_hash')) {
      await db.query(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
    }

    if (!columnNames.includes('uid')) {
      await db.query(`ALTER TABLE users ADD COLUMN uid TEXT;`);
    }
    if (!columnNames.includes('username')) {
      await db.query(`ALTER TABLE users ADD COLUMN username TEXT;`);
    }
    if (!columnNames.includes('mainCharacter')) {
      try {
        await db.query(`ALTER TABLE users ADD COLUMN "mainCharacter" TEXT;`);
      } catch (e) { }
    }

    // Fix for 500 error: record "new" has no field "updated_at"
    if (!columnNames.includes('updated_at')) {
      console.log('[SCHEMA] Adding updated_at column to users');
      await db.query(`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    }
    if (!columnNames.includes('created_at')) {
      console.log('[SCHEMA] Adding created_at column to users');
      await db.query(`ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    }

    // CRITICAL: Ensure UID has a UNIQUE constraint for ON CONFLICT (uid) to work
    const constraints = await db.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND conname = 'users_uid_unique'
    `);

    if (constraints.rows.length === 0) {
      console.log('[SCHEMA] Adding UNIQUE constraint to users.uid');
      try {
        // First delete any duplicates if they exist (unlikely but safe)
        await db.query(`
          DELETE FROM users a USING users b 
          WHERE a.id < b.id AND a.uid = b.uid;
        `);
        await db.query(`ALTER TABLE users ADD CONSTRAINT users_uid_unique UNIQUE (uid);`);
      } catch (e) {
        console.error('[SCHEMA] Failed to add unique constraint:', e.message);
      }
    }
  } catch (err) {
    console.error('Error ensuring users table schema:', err.message);
  }
}

// syncUserFromFirebase function removed (Firestore discontinued)

// Kullanıcı profili getirme
const getProfile = async (req, res) => {
  try {
    await ensureUsersTable();
    const { uid } = req.params;
    const actingUid = String(req.user?.uid || '');
    if (!actingUid || actingUid !== String(uid)) {
      return res.status(403).json({ error: 'Bu profil için yetkiniz yok' });
    }

    const result = await db.query(
      `SELECT uid, username, "mainCharacter", profile, COALESCE(other_players, '{}'::jsonb) as "otherPlayers" FROM users WHERE uid = $1 LIMIT 1;`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.json({ uid, username: null, mainCharacter: null, profile: {} });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Profil getirme hatası:', error);
    return res.status(500).json({ error: error.message });
  }
};

async function usersHasEmailColumn() {
  const res = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = 'email'
     LIMIT 1;`
  );
  return res.rows.length > 0;
}

// Kullanıcı profili güncelleme
const updateProfile = async (req, res) => {
  try {
    await ensureUsersTable();

    const { uid } = req.params;
    const actingUid = String(req.user?.uid || '');

    console.log(`[USER DEBUG] Update Profile - Param UID: ${uid}, Acting UID: ${actingUid}`);

    if (!actingUid || actingUid !== String(uid)) {
      console.warn(`[USER BLOCKED] Unauthorized profile update. Token UID: ${actingUid}, Param UID: ${uid}`);
      return res.status(403).json({ error: 'Bu profil için yetkiniz yok' });
    }

    const profile = req.body;
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ error: 'Geçersiz profil verileri' });
    }

    const payload = JSON.stringify(profile);

    // 1. Username: Giriş adı
    const loginUsername = profile?.username?.trim() || null;

    // 2. MainCharacter: Oyuncunun kendi belirlediği nick
    const mainCharacter = profile?.mainCharacter?.trim() || profile?.maincharacter?.trim() || null;

    const hasEmail = await usersHasEmailColumn();
    const email = req.user?.claims?.email || req.user?.claims?.user_identities?.email || req.user?.email || null;

    if (hasEmail && (!email || typeof email !== 'string')) {
      // Only block if the column exists and we have NO email in token
      console.warn(`[USER DEBUG] Missing email in token but email column exists.`);
      // return res.status(400).json({ error: 'Email bilgisi bulunamadı (token).' });
    }

    const upsertQuery = hasEmail
      ? `
        INSERT INTO users (uid, email, profile, username, "mainCharacter")
        VALUES ($1, $2, $3::jsonb, $4, $5)
        ON CONFLICT (uid)
        DO UPDATE SET
          email = COALESCE(users.email, EXCLUDED.email),
          profile = COALESCE(users.profile, '{}'::jsonb) || EXCLUDED.profile,
          username = COALESCE(EXCLUDED.username, users.username),
          "mainCharacter" = COALESCE(EXCLUDED."mainCharacter", users."mainCharacter")
        RETURNING *;
      `
      : `
        INSERT INTO users (uid, profile, username, "mainCharacter")
        VALUES ($1, $2::jsonb, $3, $4)
        ON CONFLICT (uid)
        DO UPDATE SET
          profile = COALESCE(users.profile, '{}'::jsonb) || EXCLUDED.profile,
          username = COALESCE(EXCLUDED.username, users.username),
          "mainCharacter" = COALESCE(EXCLUDED."mainCharacter", users."mainCharacter")
        RETURNING *;
      `;

    const params = hasEmail
      ? [uid, email, payload, loginUsername, mainCharacter]
      : [uid, payload, loginUsername, mainCharacter];

    const result = await db.query(upsertQuery, params);

    if (!result.rows[0]) {
      console.warn(`[USER DEBUG] Upsert returned no rows for UID: ${uid}`);
      return res.status(404).json({ error: 'Kullanıcı güncellenemedi' });
    }

    return res.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Profil güncelleme hatası (CRITICAL):', error);
    res.status(500).json({
      error: 'Profil güncellenirken bir hata oluştu',
      details: error.message,
      hint: 'Check if all columns (uid, email, profile, username, mainCharacter) exist in users table'
    });
  }
};

// Arkadaş ekleme (Direct PostgreSQL JSONB)
const addFriend = async (req, res) => {
  try {
    await ensureUsersTable();
    const { uid } = req.params;
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({ error: 'Nickname gerekli' });
    }

    const friendKey = `player_${Date.now()}`;
    const friendData = {
      uid: null,
      nickname: nickname.trim(),
      username: nickname.trim(),
      realUsername: null,
      linked: false
    };

    // PostgreSQL JSONB objesine yeni bir anahtar ekle
    await db.query(
      `UPDATE users 
       SET other_players = COALESCE(other_players, '{}'::jsonb) || $2::jsonb 
       WHERE uid = $1`,
      [uid, JSON.stringify({ [friendKey]: friendData })]
    );

    res.json({ key: friendKey, ...friendData });
  } catch (error) {
    console.error('Arkadaş ekleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
};

// Arkadaş silme (Direct PostgreSQL JSONB)
const deleteFriend = async (req, res) => {
  try {
    await ensureUsersTable();
    const { uid, friendKey } = req.params;

    // JSONB anahtarını silmek için - operatörü kullanılır
    await db.query(
      `UPDATE users SET other_players = other_players - $2 WHERE uid = $1`,
      [uid, friendKey]
    );

    res.json({ message: 'Arkadaş silindi' });
  } catch (error) {
    console.error('Arkadaş silme hatası:', error);
    res.status(500).json({ error: error.message });
  }
};

// Arkadaş bağlama (UID resolve edildikten sonra) - Robust Fetch-Modify-Update Pattern
const linkFriend = async (req, res) => {
  try {
    await ensureUsersTable();
    const { uid, friendKey } = req.params;
    const { targetUid, targetUsername } = req.body;

    console.log(`[DEBUG] Linking friend inside PG. uid: ${uid}, friendKey: ${friendKey}, targetUid: ${targetUid}, targetUsername: ${targetUsername}`);

    // 1. Mevcut other_players verisini çek
    const getResult = await db.query('SELECT other_players FROM users WHERE uid = $1', [uid]);
    if (getResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    let otherPlayers = getResult.rows[0].other_players || {};

    // 2. Sadece ilgili arkadaşı güncelle, diğerlerine dokunma
    if (otherPlayers[friendKey]) {
      otherPlayers[friendKey] = {
        ...otherPlayers[friendKey],
        uid: targetUid,
        realUsername: targetUsername, // Frontend bu alanı bekliyor (@username gösterimi için)
        linked: true
      };

      // 3. Veritabanına komple yeni objeyi yaz (En güvenli yol)
      await db.query(
        'UPDATE users SET other_players = $1 WHERE uid = $2',
        [JSON.stringify(otherPlayers), uid]
      );

      console.log(`[DEBUG] Friend linked successfully in PG for uid: ${uid}`);
      return res.json({ message: 'Arkadaş bağlandı', friend: otherPlayers[friendKey] });
    } else {
      console.warn(`[DEBUG] Friend key NOT FOUND in other_players: ${friendKey}`);
      return res.status(404).json({ error: 'Düzenlenecek oyuncu bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.' });
    }
  } catch (error) {
    console.error('Arkadaş bağlama hatası:', error);
    res.status(500).json({ error: error.message });
  }
};

// Kullanıcıyı USERNAME (giriş adı) ile bulma
const findUserByUsername = async (req, res) => {
  try {
    await ensureUsersTable();
    const { username } = req.params;
    const cleanUsername = username.trim();

    // 1. Önce PostgreSQL'de username kolonu üzerinden ara
    let query = `SELECT uid, username FROM users WHERE username ILIKE $1 LIMIT 1;`;
    let result = await db.query(query, [cleanUsername]); // Tam eşleşme (ILIKE ile case-insensitive)

    if (result.rows.length > 0) {
      console.log(`[DEBUG_USER_SEARCH] Found in PG (username): ${result.rows[0].uid}`);
      return res.json({ success: true, user: result.rows[0] });
    }

    // 2. PostgreSQL'de mainCharacter alanı üzerinden ara
    query = `SELECT uid, username, "mainCharacter" FROM users WHERE "mainCharacter" ILIKE $1 LIMIT 1;`;
    result = await db.query(query, [cleanUsername]);

    if (result.rows.length > 0) {
      console.log(`[DEBUG_USER_SEARCH] Found in PG (mainCharacter): ${result.rows[0].uid}`);
      return res.json({ success: true, user: result.rows[0] });
    }

    // 3. PostgreSQL'de profile JSON içinde username üzerinden ara
    query = `SELECT uid, username, "mainCharacter", profile FROM users WHERE profile->>'username' ILIKE $1 LIMIT 1;`;
    result = await db.query(query, [cleanUsername]);

    if (result.rows.length > 0) {
      console.log(`[DEBUG_USER_SEARCH] Found in PG (profile.username): ${result.rows[0].uid}`);
      // Kullanıcıyı döndürmeden önce profile username'ini de dahil et
      const user = {
        uid: result.rows[0].uid,
        username: result.rows[0].profile?.username || result.rows[0].username
      };
      return res.json({ success: true, user });
    }

    // 4. PostgreSQL'de profile JSON içinde mainCharacter üzerinden ara
    query = `SELECT uid, username, "mainCharacter", profile FROM users WHERE profile->>'mainCharacter' ILIKE $1 LIMIT 1;`;
    result = await db.query(query, [cleanUsername]);

    if (result.rows.length > 0) {
      console.log(`[DEBUG_USER_SEARCH] Found in PG (profile.mainCharacter): ${result.rows[0].uid}`);
      // Kullanıcıyı döndürmeden önce profile mainCharacter'ı da dahil et
      const user = {
        uid: result.rows[0].uid,
        username: result.rows[0].profile?.mainCharacter || result.rows[0].mainCharacter
      };
      return res.json({ success: true, user });
    }

    // Firestore fallback removed as per user request
    /*
    console.log(`[DEBUG_USER_SEARCH] NOT in PG. Trying Firestore fallback for username: "${cleanUsername}"`);

    if (admin.apps && admin.apps.length > 0) {
      const dbFs = admin.firestore();
      ...
    }
    */

    res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
  } catch (error) {
    console.error('Kullanıcı bulma hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Liste çekme (Sadece username tanımlı olanlar)
const getUsersWithUsernames = async (req, res) => {
  try {
    await ensureUsersTable();
    const query = `SELECT uid, username FROM users WHERE username IS NOT NULL AND TRIM(username) != '' ORDER BY username LIMIT 100;`;
    const result = await db.query(query);
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Kullanıcılarla ilgili hata:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  updateProfile,
  getProfile,
  addFriend,
  deleteFriend,
  linkFriend,
  findUserByUsername,
  getUsersWithUsernames
};