const pool = require('../config/database');

// Tüm klanları getir
const getAllClans = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        tag, 
        description, 
        owner_id, 
        created_at,
        settings
      FROM clans 
      ORDER BY created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Clan getirme hatası:', error);
    res.status(500).json({ error: 'Clanlar getirilemedi' });
  }
};

// Kullanıcının klanlarını getir
const getUserClans = async (req, res) => {
  try {
    const { userId } = req.params;

    // Kullanıcının sahibi olduğu klanlar ve katıldığı klanlar
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.tag, 
        c.description, 
        c.owner_id, 
        c.created_at,
        c.settings,
        cm.role as user_role,
        COALESCE(member_counts.count, 0) as member_count
      FROM clans c
      LEFT JOIN clan_members cm ON c.id = cm.clan_id AND cm.user_id = $1
      LEFT JOIN (
        SELECT clan_id, COUNT(*) as count
        FROM clan_members
        GROUP BY clan_id
      ) member_counts ON c.id = member_counts.clan_id
      WHERE c.owner_id = $1 OR cm.user_id IS NOT NULL
      ORDER BY c.created_at DESC
    `, [userId]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Kullanıcı klanları getirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı klanları getirilemedi' });
  }
};

// 6 haneli rastgele alfanumerik kod üret
function generateClanCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Yeni klan oluştur
const createClan = async (req, res) => {
  try {
    const { name, tag, description, owner_id, settings } = req.body;

    // Owner'ın zaten bir klanı olup olmadığını kontrol et
    const existingClan = await pool.query(
      'SELECT id FROM clans WHERE owner_id = $1',
      [owner_id]
    );

    if (existingClan.rows.length > 0) {
      return res.status(400).json({ error: 'Zaten bir klana sahibsiniz' });
    }

    // Aynı isimde başka bir klan var mı kontrol et
    const existingName = await pool.query(
      'SELECT id FROM clans WHERE name = $1',
      [name]
    );

    if (existingName.rows.length > 0) {
      return res.status(400).json({ error: 'Bu isimde bir klan zaten mevcut' });
    }

    // Benzersiz bir klan kodu üret
    let clanId = generateClanCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const checkId = await pool.query('SELECT id FROM clans WHERE id = $1', [clanId]);
      if (checkId.rows.length === 0) {
        isUnique = true;
      } else {
        clanId = generateClanCode();
        attempts++;
      }
    }

    const result = await pool.query(
      `INSERT INTO clans (id, name, tag, description, owner_id, settings) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [clanId, name, tag || clanId.substring(0, 4), description || '', owner_id, settings || {}]
    );

    // Klan sahibini otomatik olarak üyelik tablosuna ekle
    await pool.query(
      `INSERT INTO clan_members (clan_id, user_id, role, joined_at) 
       VALUES ($1, $2, $3, NOW())`,
      [result.rows[0].id, owner_id, 'leader']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Clan oluşturma hatası:', error);
    res.status(500).json({ error: 'Clan oluşturulamadı' });
  }
};

// Klan detaylarını getir
const getClanById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*, 
        COALESCE(member_counts.count, 0) as member_count
       FROM clans c
       LEFT JOIN (
         SELECT clan_id, COUNT(*) as count
         FROM clan_members
         GROUP BY clan_id
       ) member_counts ON c.id = member_counts.clan_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clan bulunamadı' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Clan detayları getirme hatası:', error);
    res.status(500).json({ error: 'Clan detayları getirilemedi' });
  }
};

// Klan üyelerini getir
const getClanMembers = async (req, res) => {
  try {
    const { clanId } = req.params;
    const userId = req.user?.id;

    const result = await pool.query(`
      SELECT 
        u.uid as user_id,
        cm.role,
        cm.joined_at,
        u."mainCharacter" as display_name,
        u.username
      FROM clan_members cm
      LEFT JOIN users u ON cm.user_id = u.uid
      WHERE cm.clan_id = $1
      ORDER BY cm.joined_at ASC
    `, [clanId]);

    // Eğer kullanıcı giriş yapmışsa, onun nickname bilgilerini de ekle
    if (userId) {
      console.log('[DEBUG] Requesting user ID:', userId);
      
      const userResult = await pool.query(
        'SELECT other_players FROM users WHERE uid = $1',
        [userId]
      );
      
      const otherPlayers = userResult.rows[0]?.other_players || {};
      console.log('[DEBUG] User other_players:', JSON.stringify(otherPlayers, null, 2));
      
      const nicknames = {};
      
      // Nickname bilgilerini çıkar
      for (const [key, friendData] of Object.entries(otherPlayers)) {
        if (friendData && friendData.uid && friendData.nickname) {
          nicknames[friendData.uid] = friendData.nickname;
        }
      }
      
      console.log('[DEBUG] Extracted nicknames:', nicknames);
      
      // Her klan üyesi için nickname bilgisini ekle
      const membersWithNicknames = result.rows.map(member => ({
        ...member,
        nickname: nicknames[member.user_id] || member.username
      }));
      
      console.log('[DEBUG] Final members with nicknames:', membersWithNicknames);
      
      res.status(200).json(membersWithNicknames);
    } else {
      // Kullanıcı giriş yapmamışsa, normal username'i kullan
      const membersWithUsernames = result.rows.map(member => ({
        ...member,
        nickname: member.username
      }));
      
      res.status(200).json(membersWithUsernames);
    }
  } catch (error) {
    console.error('❌ Clan üyeleri getirme hatası:', error);
    res.status(500).json({ error: 'Clan üyeleri getirilemedi' });
  }
};

// Klana üye ekle (toplu)
const addMembersToClan = async (req, res) => {
  try {
    const { clanId } = req.params;
    const { userIds } = req.body; // Array of user IDs

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı listesi' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const userId of userIds) {
        // Zaten üye mi kontrol et
        const existing = await client.query(
          'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
          [clanId, userId]
        );

        if (existing.rows.length === 0) {
          await client.query(
            'INSERT INTO clan_members (clan_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
            [clanId, userId, 'member']
          );
        }
      }

      await client.query('COMMIT');
      res.status(200).json({ message: 'Üyeler başarıyla eklendi' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Üye ekleme hatası:', error);
    res.status(500).json({ error: 'Üyeler eklenemedi' });
  }
};

// Klana başvuru
const applyToClan = async (req, res) => {
  try {
    const { clanId } = req.params;
    const { userId } = req.body;

    // Basitçe üyeliğe ekleyelim (başvuru tablosu yoksa)
    await pool.query(
      'INSERT INTO clan_members (clan_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
      [clanId, userId, 'member']
    );

    res.status(200).json({ message: 'Başvuru yapıldı' });
  } catch (error) {
    console.error('❌ Klana başvuru hatası:', error);
    res.status(500).json({ error: 'Başvuru yapılamadı' });
  }
};

// Klanı güncelle
const updateClan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tag, description, settings } = req.body;

    const result = await pool.query(
      `UPDATE clans 
       SET name = $1, tag = $2, description = $3, settings = $4
       WHERE id = $5
       RETURNING *`,
      [name, tag, description, settings, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clan bulunamadı' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Clan güncelleme hatası:', error);
    res.status(500).json({ error: 'Clan güncellenemedi' });
  }
};

// Klanı sil
const deleteClan = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Önce üyeleri sil
      await client.query('DELETE FROM clan_members WHERE clan_id = $1', [id]);

      // Sonra klanı sil
      const result = await client.query('DELETE FROM clans WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Clan bulunamadı' });
      }

      await client.query('COMMIT');
      res.status(200).json({ message: 'Clan başarıyla silindi' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Clan silme hatası:', error);
    res.status(500).json({ error: 'Clan silinemedi' });
  }
};

// Kullanıcıları getir (klana eklenebilecek) - Arkadaş listesine göre filtrelenir
const getAvailableUsers = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    // Önce kullanıcının hangi klan(lar)ının sahibi olduğunu bul
    const userClans = await pool.query(
      `SELECT id FROM clans WHERE owner_id = $1`,
      [userId]
    );

    const userClanIds = userClans.rows.map(clan => clan.id);

    if (userClanIds.length === 0) {
      return res.status(200).json([]); // Klan sahibi değilse boş liste
    }

    // Kullanıcının arkadaş listesini users.other_players alanından al
    const userResult = await pool.query(
      `SELECT other_players FROM users WHERE uid = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const otherPlayers = userResult.rows[0].other_players || {};
    const friendIds = Object.values(otherPlayers)
      .filter(player => player && player.uid && player.uid !== 'null' && player.uid !== null)
      .map(player => player.uid);

    if (friendIds.length === 0) {
      return res.status(200).json([]);
    }

    // Arkadaş listesinde olan ve SADECE BU KLANIN üyesi olmayan kullanıcıları getir
    const result = await pool.query(`
      SELECT 
        u.uid as id,
        u."mainCharacter" as nickname,
        u.username
      FROM users u
      WHERE u.uid = ANY($1)
        AND u.username IS NOT NULL 
        AND TRIM(u.username) != ''
        AND NOT EXISTS (
          SELECT 1 FROM clan_members cm 
          WHERE cm.user_id = u.uid 
          AND cm.clan_id = ANY($2)  -- Sadece bu kullanıcının klan(lar)ı
        )
      LIMIT 100
    `, [friendIds, userClanIds]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Kullanıcılar getirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
  }
};

// Kullanıcıyı klandan çıkarma (sadece klan sahibi)
const removeMemberFromClan = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    const { clanId, userId } = req.params;

    if (!ownerId || !clanId || !userId) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // Kullanıcının bu klanın sahibi olup olmadığını kontrol et
    const clanResult = await pool.query(
      `SELECT owner_id FROM clans WHERE id = $1`,
      [clanId]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Klan bulunamadı' });
    }

    if (clanResult.rows[0].owner_id !== ownerId) {
      return res.status(403).json({ error: 'Sadece klan sahibi üye çıkarabilir' });
    }

    // Üye gerçekten klanın üyesi mi?
    const memberResult = await pool.query(
      `SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2`,
      [clanId, userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bu klanın üyesi değil' });
    }

    // Lider klandan çıkarılamaz
    if (memberResult.rows[0].role === 'leader') {
      return res.status(400).json({ error: 'Klan lideri klandan çıkarılamaz' });
    }

    // Kullanıcıyı klandan kaldır
    await pool.query(
      `DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2`,
      [clanId, userId]
    );

    res.status(200).json({ message: 'Kullanıcı klandan çıkarıldı' });
  } catch (error) {
    console.error('❌ Üye çıkarma hatası:', error);
    res.status(500).json({ error: 'Üye çıkarılamadı', details: error.message });
  }
};

// --- MESAJLAŞMA SİSTEMİ ---

// Klan mesajlarını getir (Filtreleme desteği ile)
const getClanMessages = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { clanId } = req.params;
    const { text, sender, startDate, endDate } = req.query;

    if (!userId || !clanId) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }

    // Kullanıcı klanın üyesi mi?
    const memberCheck = await pool.query(
      'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Sadece klan üyeleri mesajları görebilir' });
    }

    let query = `
      SELECT m.*, u.username, u."mainCharacter"
      FROM clan_messages m
      LEFT JOIN users u ON m.sender_id = u.uid
      WHERE m.clan_id = $1
    `;
    const params = [clanId];
    let paramIndex = 2;

    if (text) {
      query += ` AND m.text ILIKE $${paramIndex++}`;
      params.push(`%${text}%`);
    }

    if (sender) {
      query += ` AND (u.display_name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex++})`;
      params.push(`%${sender}%`);
    }

    if (startDate) {
      query += ` AND m.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND m.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY m.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    const messages = result.rows;

    // 1. İzleyicinin (viewer) arkadaş listesini alalım
    const viewerResult = await pool.query('SELECT other_players FROM users WHERE uid = $1', [userId]);
    const viewerFriends = viewerResult.rows[0]?.other_players || {};

    // 2. Mesajları dolaşarak isimleri özelleştirelim
    const enrichedMessages = messages.map(msg => {
      // Başlangıçta gerçek kullanıcı adını kullan
      let displayName = msg.username || msg.sender_nick || 'Bilinmeyen';

      // DEBUG: SQL'den gelen verileri kontrol et
      if (displayName === 'Bilinmeyen') {
        console.warn(`[DEBUG_MSG] Missing names for MSG ${msg.id}. sender_id: ${msg.sender_id}, username: ${msg.username}, sender_nick: ${msg.sender_nick}`);
      }

      // Arkadaş listesinde bu kişiyi arayalım ve takma adını kullanalım
      if (viewerFriends) {
        // UID üzerinden doğrudan eşleşme (En güvenilir)
        const entries = Object.entries(viewerFriends);
        const friendEntry = entries.find(([key, f]) => f && f.uid && String(f.uid) === String(msg.sender_id));
        
        if (friendEntry && friendEntry[1].nickname) {
          // Takma adı varsa onu kullan
          displayName = friendEntry[1].nickname;
        }
      }

      // Eğer hala Bilinmeyen ise ve sender_id varsa, en azından ID'nin bir kısmını gösterelim (fallback)
      if (displayName === 'Bilinmeyen' && msg.sender_id) {
        displayName = `Kullanıcı (${msg.sender_id.substring(0, 5)})`;
      }

      return {
        ...msg,
        sender_display_name: displayName
      };
    });

    // Frontend'e kronolojik sırada (eskiden yeniye) gönderelim
    res.status(200).json(enrichedMessages.reverse());
  } catch (error) {
    console.error('❌ Mesaj getirme hatası:', error);
    res.status(500).json({ error: 'Mesajlar yüklenemedi', details: error.message });
  }
};

// Klan mesajı gönder (Rate limit dahil)
const sendClanMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { clanId } = req.params;
    const { text } = req.body;

    if (!userId || !clanId || !text) {
      return res.status(400).json({ error: 'Mesaj içeriği boş olamaz' });
    }

    // 1. Klan üyeliği kontrolü
    const memberCheck = await pool.query(
      'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [clanId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Sadece klan üyeleri mesaj gönderebilir' });
    }

    // 2. Rate Limit Kontrolü (1 dakikada max 10 mesaj)
    const rateLimitCheck = await pool.query(
      `SELECT COUNT(*) FROM clan_messages 
       WHERE sender_id = $1 AND clan_id = $2 
       AND created_at > NOW() - INTERVAL '1 minute'`,
      [userId, clanId]
    );

    const messageCount = parseInt(rateLimitCheck.rows[0].count);
    if (messageCount >= 10) {
      return res.status(429).json({ error: 'Çok hızlı mesaj gönderiyorsunuz. Dakikada en fazla 10 mesaj gönderebilirsiniz.' });
    }

    // 3. Mesajı kaydet
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Kullanıcının güncel nick bilgisini çekelim
    const userResult = await pool.query('SELECT username FROM users WHERE uid = $1', [userId]);
    const senderNick = userResult.rows[0]?.username || 'Kullanıcı';

    const insertResult = await pool.query(
      `INSERT INTO clan_messages (id, clan_id, sender_id, sender_nick, text, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [messageId, clanId, userId, senderNick, text]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('❌ Mesaj gönderme hatası:', error);
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
};

module.exports = {
  getAllClans,
  getUserClans,
  createClan,
  getClanById,
  getClanMembers,
  addMembersToClan,
  removeMemberFromClan,
  getClanMessages,
  sendClanMessage,
  applyToClan,
  updateClan,
  deleteClan,
  getAvailableUsers
};