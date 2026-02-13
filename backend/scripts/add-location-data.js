const pool = require('../config/database');

async function addLocations() {
  try {
    console.log('Location verileri ekleniyor...');
    
    // Mevcut verileri temizle
    await pool.query("DELETE FROM locations WHERE name IN ('Dorion Fields', 'Death Valley', 'Ancient Ruins')");
    
    // Yeni location verileri ekle
    await pool.query(`
      INSERT INTO locations (name, type, region, difficulty_level, monster_level_range_min, monster_level_range_max, drop_rate_multiplier, respawn_time_minutes, max_players, special_conditions) 
      VALUES 
        ('Dorion Fields', 'Field', 'Dorion', 1, 1, 15, 1.2, 5, 50, 'Safe zone during day time'),
        ('Death Valley', 'Dungeon', 'Desert', 5, 50, 70, 2.0, 15, 20, 'High level monsters, dangerous area'),
        ('Ancient Ruins', 'Ruins', 'Ancient', 8, 80, 100, 2.5, 20, 15, 'Elite monsters, rare drops')
    `);
    
    console.log('Location verileri eklendi!');
    
    // Verileri kontrol et
    const result = await pool.query('SELECT name, type, region, difficulty_level FROM locations ORDER BY id');
    console.log('Mevcut locationlar:');
    result.rows.forEach(row => {
      console.log(`- ${row.name} (${row.type}, ${row.region}, Level: ${row.difficulty_level})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Hata oluştu:', error);
    await pool.end();
  }
}

addLocations();