const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function recreateItemsTable() {
  try {
    console.log('🔄 Items tablosu yeniden oluşturuluyor...');
    
    // 1. Eski tabloyu yedekle
    console.log('1. Mevcut veriler yedekleniyor...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items_backup AS 
      SELECT * FROM items
    `);
    console.log('✅ Veriler yedeklendi');
    
    // 2. Eski tabloyu sil
    console.log('2. Eski items tablosu siliniyor...');
    await pool.query('DROP TABLE IF EXISTS items');
    console.log('✅ Eski tablo silindi');
    
    // 3. Yeni tabloyu oluştur
    console.log('3. Yeni items tablosu oluşturuluyor...');
    await pool.query(`
      CREATE TABLE items (
        id SERIAL PRIMARY KEY,
        item_cesidi VARCHAR(100),
        item_adi VARCHAR(100) UNIQUE NOT NULL,
        item_turu VARCHAR(50),
        sinif VARCHAR(50),
        seviye INTEGER,
        gear_score DECIMAL(10,2),
        fiziksel_savunma_bonusu INTEGER,
        strength_bonus INTEGER,
        dexterity_bonus INTEGER,
        intelligence_bonus INTEGER,
        magic_bonus INTEGER,
        health_bonus INTEGER,
        hp_bonusu INTEGER,
        mp_bonusu INTEGER,
        ates_hasari_direnci INTEGER,
        buz_hasari_direnci INTEGER,
        yildirim_hasari_direnci INTEGER,
        zehir_hasari_direnci INTEGER,
        kutsal_hasari_direnci INTEGER,
        lanet_hasari_direnci INTEGER,
        hancer_savunmasi INTEGER,
        kilic_savunmasi INTEGER,
        topuz_savunmasi INTEGER,
        balta_savunmasi INTEGER,
        mizrak_savunmasi INTEGER,
        yay_savunmasi INTEGER,
        exp_bonusu DECIMAL(5,2),
        coin_bonusu DECIMAL(5,2),
        tum_yaratiklara_karsi_saldiri_bonusu DECIMAL(5,2),
        ates_hasari INTEGER,
        buz_hasari INTEGER,
        yildirim_hasari INTEGER,
        oldurme_basina_bp_bonusu INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Yeni tablo oluşturuldu');
    
    // 4. Index'leri oluştur
    console.log('4. Indexler oluşturuluyor...');
    await pool.query('CREATE INDEX idx_items_item_adi ON items(item_adi)');
    await pool.query('CREATE INDEX idx_items_item_turu ON items(item_turu)');
    await pool.query('CREATE INDEX idx_items_sinif ON items(sinif)');
    console.log('✅ Indexler oluşturuldu');
    
    // 5. Tablo yapısını göster
    console.log('\n📊 Yeni Items tablosu yapısı:');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'items' 
      ORDER BY ordinal_position
    `);
    
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    await pool.end();
    console.log('\n🎉 Items tablosu başarıyla yeniden oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

recreateItemsTable();