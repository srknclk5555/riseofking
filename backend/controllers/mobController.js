const pool = require('../config/database');

// Tüm mob'ları getir
const getAllMobs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mobs ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Mob getirme hatası:', error);
    res.status(500).json({ error: 'Moblar getirilemedi' });
  }
};

// Belirli bir mob'ı ID ile getir
const getMobById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM mobs WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mob bulunamadı' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Mob getirme hatası:', error);
    res.status(500).json({ error: 'Mob getirilemedi' });
  }
};

// Yeni mob ekle
const createMob = async (req, res) => {
  try {
    const { 
      name, type, level, hp, attack_power, defense, experience_reward,
      drop_chance, location_id, is_elite, weakness, resistance, spawn_frequency, ai_behavior
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO mobs (
        name, type, level, hp, attack_power, defense, experience_reward,
        drop_chance, location_id, is_elite, weakness, resistance, spawn_frequency, ai_behavior
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        name, type, level, hp, attack_power, defense, experience_reward,
        drop_chance, location_id, is_elite, weakness, resistance, spawn_frequency, ai_behavior
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Mob ekleme hatası:', error);
    res.status(500).json({ error: 'Mob eklenemedi' });
  }
};

// Mob güncelle
const updateMob = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, type, level, hp, attack_power, defense, experience_reward,
      drop_chance, location_id, is_elite, weakness, resistance, spawn_frequency, ai_behavior
    } = req.body;
    
    const result = await pool.query(
      `UPDATE mobs SET 
        name=$1, type=$2, level=$3, hp=$4, attack_power=$5, defense=$6, experience_reward=$7,
        drop_chance=$8, location_id=$9, is_elite=$10, weakness=$11, resistance=$12, spawn_frequency=$13, ai_behavior=$14
        WHERE id=$15 RETURNING *`,
      [
        name, type, level, hp, attack_power, defense, experience_reward,
        drop_chance, location_id, is_elite, weakness, resistance, spawn_frequency, ai_behavior, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mob bulunamadı' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Mob güncelleme hatası:', error);
    res.status(500).json({ error: 'Mob güncellenemedi' });
  }
};

// Mob sil
const deleteMob = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM mobs WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mob bulunamadı' });
    }
    
    res.status(200).json({ message: 'Mob başarıyla silindi' });
  } catch (error) {
    console.error('❌ Mob silme hatası:', error);
    res.status(500).json({ error: 'Mob silinemedi' });
  }
};

// Mob sayısını getir
const getMobCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM mobs');
    res.status(200).json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('❌ Mob sayısı getirme hatası:', error);
    res.status(500).json({ error: 'Mob sayısı getirilemedi' });
  }
};

module.exports = {
  getAllMobs,
  getMobById,
  createMob,
  updateMob,
  deleteMob,
  getMobCount
};