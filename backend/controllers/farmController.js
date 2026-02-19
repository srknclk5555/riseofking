const pool = require('../config/database');
const NotificationService = require('../services/notificationService');

// Tüm farm'ları getir
const getAllFarms = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM farms ORDER BY date DESC, created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Farm getirme hatası:', error);
    res.status(500).json({ error: 'Farm\'lar getirilemedi' });
  }
};

// Belirli bir farm'ı ID ile getir
const getFarmById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM farms WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Farm bulunamadı' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Farm getirme hatası:', error);
    res.status(500).json({ error: 'Farm getirilemedi' });
  }
};

// Yeni farm ekle
const createFarm = async (req, res) => {
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
  try {
    const { id } = req.params;
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
      `UPDATE farms SET 
        farm_number=$1, owner_id=$2, date=$3, duration=$4, location=$5, mob=$6, 
        participants=$7, items=$8, total_revenue=$9, share_per_person=$10, 
        type=$11, status=$12, main_character_name=$13, updated_at=CURRENT_TIMESTAMP
        WHERE id=$14 RETURNING *`,
      [
        farm_number, owner_id, date, duration, location, mob, participantsJson, itemsJson,
        total_revenue, share_per_person, type, status, main_character_name, id
      ]
    );

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
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM farms WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Farm bulunamadı' });
    }

    res.status(200).json({ message: 'Farm başarıyla silindi' });
  } catch (error) {
    console.error('❌ Farm silme hatası:', error);
    res.status(500).json({ error: 'Farm silinemedi' });
  }
};

// Farm sayısını getir
const getFarmCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM farms');
    res.status(200).json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('❌ Farm sayısı getirme hatası:', error);
    res.status(500).json({ error: 'Farm sayısı getirilemedi' });
  }
};

// Kullanıcının farm'larını getir
const getUserFarms = async (req, res) => {
  try {
    const { userId } = req.params;
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