const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function addItemTypeColumn() {
  try {
    console.log('🔄 item_type kolonu ekleniyor...');
    
    // Önce kolon var mı kontrol et
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'items' AND column_name = 'item_type'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ item_type kolonu zaten mevcut');
    } else {
      // Kolonu ekle
      await pool.query('ALTER TABLE items ADD COLUMN item_type VARCHAR(50)');
      console.log('✅ item_type kolonu başarıyla eklendi');
    }
    
    // Tablo yapısını göster
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'items' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Items tablosu yapısı:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

addItemTypeColumn();