const pool = require('../config/database');

async function addMissingLocationColumns() {
  try {
    console.log('Eksik location sütunları ekleniyor...');
    
    // Location tablosuna eksik sütunları ekle
    const columnsToAdd = [
      { name: 'type', type: 'TEXT', defaultValue: 'NULL' },
      { name: 'region', type: 'TEXT', defaultValue: 'NULL' },
      { name: 'difficulty_level', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'monster_level_range_min', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'monster_level_range_max', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'drop_rate_multiplier', type: 'NUMERIC', defaultValue: 'NULL' },
      { name: 'respawn_time_minutes', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'max_players', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'is_pvp', type: 'BOOLEAN', defaultValue: 'FALSE' },
      { name: 'entrance_fee', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'special_conditions', type: 'TEXT', defaultValue: 'NULL' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await pool.query(`
          ALTER TABLE locations 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} DEFAULT ${column.defaultValue}
        `);
        console.log(`${column.name} sütunu başarıyla eklendi!`);
      } catch (err) {
        console.log(`${column.name} sütunu zaten mevcut veya başka bir nedenle eklenemedi:`, err.message);
      }
    }
    
    console.log('Tüm eksik location sütunları kontrol edildi ve eklendi!');
    
    await pool.end();
  } catch (error) {
    console.error('Hata oluştu:', error);
    await pool.end();
  }
}

addMissingLocationColumns();