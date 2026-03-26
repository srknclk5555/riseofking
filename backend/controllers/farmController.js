const pool = require('../config/database');
const NotificationService = require('../services/notificationService');

// Tüm farm'ları getir (SADECE kendi farm'larını)
const getAllFarms = async (req, res) => {
  // Null guard: req.user kontrolü
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Yetkisiz erişim - Kullanıcı bilgisi bulunamadı' });
  }
  
  try {
    // KRİTİK GÜVENLİK: Kullanıcı sadece kendi farm'larını görebilir
    const result = await pool.query(
      'SELECT * FROM farms WHERE owner_id = $1 ORDER BY date DESC, created_at DESC',
      [req.user.uid]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Farm getirme hatası:', error);
    res.status(500).json({ error: 'Farm\'lar getirilemedi' });
  }
};

// Belirli bir farm'ı ID ile getir
const getFarmById = async (req, res) => {
  // Null guard: req.user kontrolü
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Yetkisiz erişim - Kullanıcı bilgisi bulunamadı' });
  }
  
  try {
    const { id } = req.params;
    
    // Yetki kontrolü: Kullanıcı sadece kendi farm'ını görebilir (owner_id veya participants içinde)
    const result = await pool.query(
      `SELECT * FROM farms WHERE id = $1 AND (
        owner_id = $2 OR 
        $2 = ANY(SELECT DISTINCT value->>'uid' FROM jsonb_array_elements(participants) AS value)
      )`,
      [id, req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Farm bulunamadı veya erişim yetkiniz yok' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Farm getirme hatası:', error);
    res.status(500).json({ error: 'Farm getirilemedi' });
  }
};

// Yeni farm ekle
const createFarm = async (req, res) => {
  // Null guard: req.user kontrolü
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Yetkisiz erişim - Kullanıcı bilgisi bulunamadı' });
  }
  
  try {
    const {
      farmNumber, ownerId, date, duration, location, mob, participants, items,
      totalRevenue, sharePerPerson, type, status, main_character_name
    } = req.body;

    // Field mapping
    const farm_number = farmNumber;
    const owner_id = ownerId;
    const total_revenue = totalRevenue;
    const share_per_person = sharePerPerson;

    // Array'leri JSON string'e çevir ve hata kontrolü yap
    let participantsJson, itemsJson;
    try {
      participantsJson = JSON.stringify(participants || []);
    } catch (error) {
      console.error('Participants JSON serialize hatası:', error);
      return res.status(400).json({ error: 'Participants verisi JSON\'a dönüştürülemedi', details: error.message });
    }
    try {
      itemsJson = JSON.stringify(items || []);
    } catch (error) {
      console.error('Items JSON serialize hatası:', error);
      return res.status(400).json({ error: 'Items verisi JSON\'a dönüştürülemedi', details: error.message });
    }

    const result = await pool.query(
      `INSERT INTO farms (
        farm_number, owner_id, date, duration, location, mob, participants, items,
        total_revenue, share_per_person, type, status, main_character_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        farm_number, owner_id, date, duration, location, mob, participantsJson, itemsJson,
        total_revenue, share_per_person, type, status, main_character_name
      ]
    );

    const farmData = result.rows[0];

    // BİLDİRİM: Katılımcılara bildirim gönder (Owner hariç)
    if (participants && Array.isArray(participants)) {
      const notifications = participants
        .filter(p => p.uid && p.uid !== owner_id)
        .map(p => ({
          receiver_id: p.uid,
          title: 'Yeni Farm Kaydı',
          text: `${main_character_name || 'Bir kullanıcı'} sizi yeni bir farm kaydına ekledi: ${location} (${farm_number})`,
          related_id: farmData.id.toString(),
          type: 'farm_created'
        }));

      if (notifications.length > 0) {
        await NotificationService.createMultiple(notifications);
      }
    }

    res.status(201).json(farmData);
  } catch (error) {
    console.error('❌ Farm ekleme hatası:', error);
    res.status(500).json({ error: 'Farm eklenemedi' });
  }
};

// Farm güncelle
const updateFarm = async (req, res) => {
  // Null guard: req.user kontrolü
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Yetkisiz erişim - Kullanıcı bilgisi bulunamadı' });
  }
  
  try {
    const { id } = req.params;
    const {
      farmNumber, ownerId, date, duration, location, mob, participants, items,
      totalRevenue, sharePerPerson, type, status, main_character_name
    } = req.body;

    // Yetki kontrolü: SADECE owner güncelleyebilir (admin dahil kimse değil)
    const checkQuery = await pool.query(
      'SELECT owner_id FROM farms WHERE id = $1',
      [id]
    );
    
    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Farm bulunamadı' });
    }
    
    const farmOwnerId = checkQuery.rows[0].owner_id;
    if (farmOwnerId !== req.user.uid) {
      return res.status(403).json({ error: 'Bu farm\'ı güncelleme yetkiniz yok' });
    }

    // Dinamik query: Sadece gelen alanları güncelle (COALESCE ile)
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (farmNumber !== undefined) {
      updates.push(`farm_number = $${paramIndex++}`);
      values.push(farmNumber);
    }
    if (ownerId !== undefined) {
      updates.push(`owner_id = $${paramIndex++}`);
      values.push(ownerId);
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(date);
    }
    if (duration !== undefined) {
      updates.push(`duration = $${paramIndex++}`);
      values.push(duration);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    if (mob !== undefined) {
      updates.push(`mob = $${paramIndex++}`);
      values.push(mob);
    }
    if (participants !== undefined) {
      updates.push(`participants = $${paramIndex++}`);
      values.push(JSON.stringify(participants || []));
    }
    if (items !== undefined) {
      updates.push(`items = $${paramIndex++}`);
      values.push(JSON.stringify(items || []));
    }
    if (totalRevenue !== undefined) {
      updates.push(`total_revenue = $${paramIndex++}`);
      values.push(totalRevenue);
    }
    if (sharePerPerson !== undefined) {
      updates.push(`share_per_person = $${paramIndex++}`);
      values.push(sharePerPerson);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (main_character_name !== undefined) {
      updates.push(`main_character_name = $${paramIndex++}`);
      values.push(main_character_name);
    }

    // updated_at her zaman güncellensin
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi' });
    }

    // WHERE clause için owner_id ekle (güvenlik)
    values.push(id);
    values.push(farmOwnerId);

    const query = `
      UPDATE farms 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND owner_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Farm bulunamadı' });
    }

    const updatedFarm = result.rows[0];

    // BİLDİRİM: Katılımcılara güncelleme bildirimi gönder (Owner hariç)
    if (participants && Array.isArray(participants)) {
      const notifications = participants
        .filter(p => p.uid && p.uid !== owner_id)
        .map(p => ({
          receiver_id: p.uid,
          title: 'Farm Güncellendi',
          text: `${main_character_name || 'Bir kullanıcı'} dahil olduğunuz farm kaydını güncelledi: ${location} (${farm_number})`,
          related_id: id.toString(),
          type: 'farm_updated'
        }));

      if (notifications.length > 0) {
        await NotificationService.createMultiple(notifications);
      }
    }

    res.status(200).json(updatedFarm);
  } catch (error) {
    console.error('❌ Farm güncelleme hatası:', error);
    res.status(500).json({ error: 'Farm güncellenemedi' });
  }
};

// Farm sil
const deleteFarm = async (req, res) => {
  // Null guard: req.user kontrolü
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Yetkisiz erişim - Kullanıcı bilgisi bulunamadı' });
  }
  
  try {
    const { id } = req.params;
    
    // Yetki kontrolü: SADECE owner silebilir (admin dahil kimse değil)
    const checkQuery = await pool.query(
      'SELECT owner_id FROM farms WHERE id = $1',
      [id]
    );
    
    if (checkQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Farm bulunamadı' });
    }
    
    const farmOwnerId = checkQuery.rows[0].owner_id;
    if (farmOwnerId !== req.user.uid) {
      return res.status(403).json({ error: 'Bu farm\'ı silme yetkiniz yok' });
    }
    
    const result = await pool.query(
      'DELETE FROM farms WHERE id = $1 AND owner_id = $2 RETURNING *',
      [id, farmOwnerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Farm bulunamadı' });
    }

    res.status(200).json({ message: 'Farm başarıyla silindi' });
  } catch (error) {
    console.error('❌ Farm silme hatası:', error);
    res.status(500).json({ error: 'Farm silinemedi' });
  }
};

// Farm sayısını getir (SADECE kendi farm'ları)
const getFarmCount = async (req, res) => {
  // Null guard: req.user kontrolü
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Yetkisiz erişim - Kullanıcı bilgisi bulunamadı' });
  }
  
  try {
    // KRİTİK GÜVENLİK: Kullanıcı sadece kendi farm sayısını görebilir
    const result = await pool.query(
      'SELECT COUNT(*) FROM farms WHERE owner_id = $1',
      [req.user.uid]
    );
    res.status(200).json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('❌ Farm sayısı getirme hatası:', error);
    res.status(500).json({ error: 'Farm sayısı getirilemedi' });
  }
};

// Kullanıcının farm'larını getir (ZATEN GÜVENLİ)
const getUserFarms = async (req, res) => {
  // Null guard: req.user kontrolü
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Yetkisiz erişim - Kullanıcı bilgisi bulunamadı' });
  }
  
  try {
    const { userId } = req.params;
    
    // KRİTİK GÜVENLİK: Kullanıcı sadece kendi farm'larını görebilir
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Yetkisiz erişim. Sadece kendi farm listenizi görebilirsiniz.' });
    }
    
    // Owner veya participant olarak eklenmiş farm'ları getir
    const result = await pool.query(`
      SELECT * FROM farms 
      WHERE owner_id = $1 OR $1 = ANY(
        SELECT DISTINCT value->>'uid' 
        FROM jsonb_array_elements(participants) AS value
      )
      ORDER BY date DESC, created_at DESC
    `, [userId]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Kullanıcı farm\'ları getirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı farm\'ları getirilemedi' });
  }
};

module.exports = {
  getAllFarms,
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm,
  getFarmCount,
  getUserFarms
};