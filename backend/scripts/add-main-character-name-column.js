const pool = require('../config/database');

async function addMainCharacterNameColumn() {
  try {
    console.log('Main character name sütunu ekleniyor...');
    
    // Tabloya main_character_name sütunu ekle
    await pool.query(`
      ALTER TABLE farms 
      ADD COLUMN IF NOT EXISTS main_character_name TEXT DEFAULT NULL
    `);
    
    console.log('Main character name sütunu başarıyla eklendi!');
    
    // Tabloyu doğrula
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'farms' AND column_name = 'main_character_name'
    `);
    
    if (result.rows.length > 0) {
      console.log('Sütun doğrulandı:', result.rows[0]);
    } else {
      console.log('Sütun bulunamadı');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Hata oluştu:', error);
    await pool.end();
  }
}

addMainCharacterNameColumn();