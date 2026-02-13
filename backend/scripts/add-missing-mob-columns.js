const pool = require('../config/database');

async function addMissingMobColumns() {
  try {
    console.log('Eksik mob sütunları ekleniyor...');
    
    // Mob tablosuna eksik sütunları ekle
    const columnsToAdd = [
      { name: 'type', type: 'TEXT', defaultValue: 'NULL' },
      { name: 'level', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'hp', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'attack_power', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'defense', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'experience_reward', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'drop_chance', type: 'NUMERIC', defaultValue: 'NULL' },
      { name: 'location_id', type: 'INTEGER', defaultValue: 'NULL' },
      { name: 'is_elite', type: 'BOOLEAN', defaultValue: 'FALSE' },
      { name: 'weakness', type: 'TEXT', defaultValue: 'NULL' },
      { name: 'resistance', type: 'TEXT', defaultValue: 'NULL' },
      { name: 'spawn_frequency', type: 'TEXT', defaultValue: 'NULL' },
      { name: 'ai_behavior', type: 'TEXT', defaultValue: 'NULL' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await pool.query(`
          ALTER TABLE mobs 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} DEFAULT ${column.defaultValue}
        `);
        console.log(`${column.name} sütunu başarıyla eklendi!`);
      } catch (err) {
        console.log(`${column.name} sütunu zaten mevcut veya başka bir nedenle eklenemedi:`, err.message);
      }
    }
    
    console.log('Tüm eksik mob sütunları kontrol edildi ve eklendi!');
    
    await pool.end();
  } catch (error) {
    console.error('Hata oluştu:', error);
    await pool.end();
  }
}

addMissingMobColumns();