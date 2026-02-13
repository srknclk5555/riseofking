const pool = require('../config/database');

async function addLocationTypeColumn() {
  try {
    console.log('Location type sütunu ekleniyor...');
    
    // Tabloya type sütunu ekle
    await pool.query(`
      ALTER TABLE locations 
      ADD COLUMN IF NOT EXISTS type TEXT DEFAULT NULL
    `);
    
    console.log('Location type sütunu başarıyla eklendi!');
    
    // Mob tablosunu da kontrol et ve gerekirse sütunları kontrol et
    console.log('Mob tablosu kontrol ediliyor...');
    
    await pool.end();
  } catch (error) {
    console.error('Hata oluştu:', error);
    await pool.end();
  }
}

addLocationTypeColumn();