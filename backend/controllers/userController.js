const db = require('../config/database');
const admin = require('firebase-admin');

// Firebase admin SDK'yı başlat (server.js'de zaten başlatılıyor ama burada da kontrol edelim)
let firestoreDb;
try {
  firestoreDb = admin.firestore();
} catch (error) {
  console.log('Firebase not initialized, will use direct connection');
}

async function ensureUsersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      profile JSONB DEFAULT '{}'::jsonb,
      other_players JSONB DEFAULT '{}'::jsonb,
      username TEXT,
      "mainCharacter" TEXT
    );
  `);
  // Ensure the standardized columns exist
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "mainCharacter" TEXT;`);
}

// Firebase'den kullanıcı verilerini alıp PostgreSQL'i güncelleyen fonksiyon
async function syncUserFromFirebase(userId) {
  try {
    if (!firestoreDb) {
      console.log('Firebase not available, skipping sync');
      return;
    }

    // Firestore'dan kullanıcı verilerini al
    const userDoc = await firestoreDb.collection('artifacts').doc('rise_online_tracker_app')
      .collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log(`Kullanıcı ${userId} için Firestore verisi bulunamadı.`);
      return;
    }

    const firestoreData = userDoc.data();
    const firestoreOtherPlayers = firestoreData.otherPlayers || {};

    // Firestore'daki otherPlayers yapısını PostgreSQL formatına dönüştür
    const postgresqlOtherPlayers = {};
    let playerIndex = 0;

    for (const [firestoreKey, firestoreFriend] of Object.entries(firestoreOtherPlayers)) {
      if (firestoreFriend && firestoreFriend.uid) {
        const playerKey = `player_${playerIndex}`;

        postgresqlOtherPlayers[playerKey] = {
          uid: firestoreFriend.uid,
          nickname: firestoreFriend.nickname || firestoreFriend.realUsername || 'Bilinmeyen',
          username: firestoreFriend.realUsername || 'Bilinmeyen'
        };

        playerIndex++;
      }
    }

    // PostgreSQL'i güncelle
    await db.query(
      'UPDATE users SET other_players = $1 WHERE uid = $2',
      [postgresqlOtherPlayers, userId]
    );

    console.log(`Kullanıcı ${userId} için other_players senkronize edildi. Toplam ${playerIndex} arkadaş.`);

  } catch (error) {
    console.error(`Kullanıcı ${userId} senkronizasyon hatası:`, error.message);
  }
}

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
      `SELECT uid, username, "mainCharacter", profile FROM users WHERE uid = $1 LIMIT 1;`,
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

    if (!actingUid || actingUid !== String(uid)) {
      return res.status(403).json({ error: 'Bu profil için yetkiniz yok' });
    }

    const profile = req.body;
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ error: 'Geçersiz profil verileri' });
    }

    const payload = JSON.stringify(profile);

    // 1. Username: Giriş adı (Arama için kullanılır)
    const loginUsername = profile?.username?.trim() || null;

    // 2. MainCharacter: Oyuncunun kendi belirlediği nick
    const mainCharacter = profile?.mainCharacter?.trim() || profile?.maincharacter?.trim() || null;

    const hasEmail = await usersHasEmailColumn();
    const email = req.user?.claims?.email || req.user?.claims?.user_identities?.email || req.user?.email;

    if (hasEmail && (!email || typeof email !== 'string')) {
      return res.status(400).json({ error: 'Email bilgisi bulunamadı (token).' });
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
    return res.json(result.rows[0]);

  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
};

// Arkadaş ekleme
const addFriend = async (req, res) => {
  try {
    await ensureUsersTable();
    const { uid } = req.params;
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({ error: 'Nickname gerekli' });
    }

    const key = Date.now().toString();

    // Sadece Firestore'a ekle (frontend zaten yapar)
    // Ancak PostgreSQL'i de güncelleyelim

    // Firestore'dan kullanıcı verilerini al ve PostgreSQL'i güncelle
    await syncUserFromFirebase(uid);

    res.json({ key, nickname, linked: false });
  } catch (error) {
    console.error('Arkadaş ekleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
};

// Arkadaş silme
const deleteFriend = async (req, res) => {
  try {
    await ensureUsersTable();
    const { uid, friendKey } = req.params;

    // Sadece PostgreSQL'den sil (Firestore frontend tarafından zaten silinir)
    await db.query(`UPDATE users SET other_players = other_players - $2 WHERE uid = $1`, [uid, friendKey]);

    // Firestore'dan veriyi al ve PostgreSQL'i güncelle
    await syncUserFromFirebase(uid);

    res.json({ message: 'Arkadaş silindi' });
  } catch (error) {
    console.error('Arkadaş silme hatası:', error);
    res.status(500).json({ error: error.message });
  }
};

// Arkadaş bağlama (UID resolve edildikten sonra)
const linkFriend = async (req, res) => {
  try {
    await ensureUsersTable();
    const { uid, friendKey } = req.params;
    const { targetUid, targetNickname } = req.body;

    const query = `
      UPDATE users 
      SET other_players = jsonb_set(
        other_players,
        array[$2, 'uid'],
        to_jsonb($3::text)
      ) || jsonb_set(
        other_players,
        array[$2, 'nickname'],
        to_jsonb($4::text)
      ) || jsonb_set(
        other_players,
        array[$2, 'linked'],
        'true'::jsonb
      )
      WHERE uid = $1
      RETURNING *;
    `;

    await db.query(query, [uid, friendKey, targetUid, targetNickname]);

    // Firestore'dan veriyi al ve PostgreSQL'i güncelle
    await syncUserFromFirebase(uid);

    res.json({ message: 'Arkadaş bağlandı' });
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

    // 5. Fallback: Firestore'da profile.username üzerinden ara
    console.log(`[DEBUG_USER_SEARCH] NOT in PG. Trying Firestore fallback for username: "${cleanUsername}"`);

    if (admin.apps && admin.apps.length > 0) {
      const dbFs = admin.firestore();
      const usersRef = dbFs.collection('artifacts').doc('rise_online_tracker_app').collection('users');

      let q = await usersRef.where('profile.username', '==', cleanUsername).limit(1).get();

      if (!q.empty) {
        const userDoc = q.docs[0];
        const data = userDoc.data();
        const foundUser = {
          uid: userDoc.id,
          username: data.profile?.username || cleanUsername
        };
        console.log(`[DEBUG_USER_SEARCH] Found in Firestore (username): ${foundUser.uid}`);
        return res.json({ success: true, user: foundUser });
      }

      // 6. Fallback: Firestore'da profile.mainCharacter üzerinden ara
      q = await usersRef.where('profile.mainCharacter', '==', cleanUsername).limit(1).get();

      if (!q.empty) {
        const userDoc = q.docs[0];
        const data = userDoc.data();
        const foundUser = {
          uid: userDoc.id,
          username: data.profile?.mainCharacter || cleanUsername
        };
        console.log(`[DEBUG_USER_SEARCH] Found in Firestore (mainCharacter): ${foundUser.uid}`);
        return res.json({ success: true, user: foundUser });
      }
    }

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