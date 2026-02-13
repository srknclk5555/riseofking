const pool = require('../config/database');

async function addMobTypeColumn() {
  try {
    console.log('Mob type sütunu ekleniyor...');
    
    // Tabloya type sütunu ekle
    await pool.query(`
      ALTER TABLE mobs 
      ADD COLUMN IF NOT EXISTS type TEXT DEFAULT NULL
    `);
    
    console.log('Mob type sütunu başarıyla eklendi!');
    
    await pool.end();
  } catch (error) {
    console.error('Hata oluştu:', error);
    await pool.end();
  }
}

addMobTypeColumn();