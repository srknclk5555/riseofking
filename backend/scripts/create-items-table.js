const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function createItemsTable() {
  try {
    console.log('🔄 Items tablosu oluşturuluyor...');
    
    const query = `
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        item_cesidi VARCHAR(100),
        item_adi VARCHAR(255) NOT NULL,
        item_turu VARCHAR(50),
        sinif VARCHAR(50),
        seviye INTEGER,
        gear_score INTEGER,
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
        exp_bonusu DECIMAL(10,2),
        coin_bonusu DECIMAL(10,2),
        tum_yaratiklara_karsi_saldiri_bonusu DECIMAL(10,2),
        ates_hasari INTEGER,
        buz_hasari INTEGER,
        yildirim_hasari INTEGER,
        oldurme_basina_bp_bonusu INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(query);
    console.log('✅ Items tablosu başarıyla oluşturuldu!');
    
    // Tabloyu kontrol et
    const result = await pool.query('SELECT COUNT(*) FROM items');
    console.log(`📊 Items tablosunda ${result.rows[0].count} kayıt var.`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Items tablosu oluşturulurken hata:', error);
    await pool.end();
  }
}

// Scripti çalıştır
createItemsTable();