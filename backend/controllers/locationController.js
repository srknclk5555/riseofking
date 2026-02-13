const pool = require('../config/database');

// Tüm location'ları getir
const getAllLocations = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Location getirme hatası:', error);
    res.status(500).json({ error: 'Locationlar getirilemedi' });
  }
};

// Belirli bir location'ı ID ile getir
const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location bulunamadı' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Location getirme hatası:', error);
    res.status(500).json({ error: 'Location getirilemedi' });
  }
};

// Yeni location ekle
const createLocation = async (req, res) => {
  try {
    const { 
      name, type, region, difficulty_level, monster_level_range_min, monster_level_range_max,
      drop_rate_multiplier, respawn_time_minutes, max_players, is_pvp, entrance_fee, special_conditions
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO locations (
        name, type, region, difficulty_level, monster_level_range_min, monster_level_range_max,
        drop_rate_multiplier, respawn_time_minutes, max_players, is_pvp, entrance_fee, special_conditions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        name, type, region, difficulty_level, monster_level_range_min, monster_level_range_max,
        drop_rate_multiplier, respawn_time_minutes, max_players, is_pvp, entrance_fee, special_conditions
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Location ekleme hatası:', error);
    res.status(500).json({ error: 'Location eklenemedi' });
  }
};

// Location güncelle
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, type, region, difficulty_level, monster_level_range_min, monster_level_range_max,
      drop_rate_multiplier, respawn_time_minutes, max_players, is_pvp, entrance_fee, special_conditions
    } = req.body;
    
    const result = await pool.query(
      `UPDATE locations SET 
        name=$1, type=$2, region=$3, difficulty_level=$4, monster_level_range_min=$5, monster_level_range_max=$6,
        drop_rate_multiplier=$7, respawn_time_minutes=$8, max_players=$9, is_pvp=$10, entrance_fee=$11, special_conditions=$12
        WHERE id=$13 RETURNING *`,
      [
        name, type, region, difficulty_level, monster_level_range_min, monster_level_range_max,
        drop_rate_multiplier, respawn_time_minutes, max_players, is_pvp, entrance_fee, special_conditions, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location bulunamadı' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Location güncelleme hatası:', error);
    res.status(500).json({ error: 'Location güncellenemedi' });
  }
};

// Location sil
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location bulunamadı' });
    }
    
    res.status(200).json({ message: 'Location başarıyla silindi' });
  } catch (error) {
    console.error('❌ Location silme hatası:', error);
    res.status(500).json({ error: 'Location silinemedi' });
  }
};

// Location sayısını getir
const getLocationCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM locations');
    res.status(200).json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('❌ Location sayısı getirme hatası:', error);
    res.status(500).json({ error: 'Location sayısı getirilemedi' });
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationCount
};