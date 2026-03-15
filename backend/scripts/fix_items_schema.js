const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// SSL Ayarı (DATABASE_URL varsa veya Neon kullanılıyorsa gerekli)
const poolConfig = {
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
}

// SSL'i zorunlu kıl (Hata mesajına göre)
poolConfig.ssl = {
  rejectUnauthorized: false
};

const pool = new Pool(poolConfig);

async function fixSchema() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Veritabanına bağlanıldı.');
    console.log('🔄 Veritabanı şeması hizalanıyor...');

    // 1. Mevcut sütunları kontrol et
    const columnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'items'
    `);
    const existingColumns = new Set(columnCheck.rows.map(r => r.column_name));
    console.log(`  Mevcut sütun sayısı: ${existingColumns.size}`);

    // 2. Eksik İngilizce sütunları ve yeni silah özelliklerini ekle
    const columnsToAdd = [
      { name: 'name', type: 'VARCHAR(100)' },
      { name: 'itemtype', type: 'VARCHAR(100)' },
      { name: 'rarity', type: 'VARCHAR(50)' },
      { name: 'class', type: 'VARCHAR(50)' },
      { name: 'level', type: 'INTEGER' },
      { name: 'gearscore', type: 'INTEGER' },
      { name: 'attack_power', type: 'INTEGER' },
      { name: 'physical_defense', type: 'INTEGER' },
      { name: 'weight', type: 'DECIMAL(10,2)' },
      { name: 'durability', type: 'INTEGER' },
      { name: 'required_level', type: 'INTEGER' },
      { name: 'required_str', type: 'INTEGER' },
      { name: 'required_hp', type: 'INTEGER' }
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.has(col.name)) {
        try {
          console.log(`  + Sütun ekleniyor: ${col.name}`);
          // PostgreSQL'de IF NOT EXISTS sütun ekleme desteği versiyona bağlıdır, try-catch daha güvenli
          await client.query(`ALTER TABLE items ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
          if (e.code === '42701') console.log(`  (zaten var): ${col.name}`);
          else console.error(`  ⚠️  ${col.name} eklenirken hata:`, e.message);
        }
      } else {
          console.log(`  (zaten var): ${col.name}`);
      }
    }

    // 3. Verileri senkronize et (Türkçe -> İngilizce)
    console.log('🔄 Veriler senkronize ediliyor...');
    
    const mappings = [
      ['name', 'item_adi'],
      ['itemtype', 'item_cesidi'],
      ['rarity', 'item_turu'],
      ['class', 'sinif'],
      ['level', 'seviye'],
      ['gearscore', 'gear_score']
    ];

    for (const [eng, tr] of mappings) {
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name IN ('${eng}', '${tr}')
      `);
      const cols = colCheck.rows.map(r => r.column_name);
      
      if (cols.includes(eng) && cols.includes(tr)) {
        try {
          const sql = `UPDATE items SET ${eng} = ${tr} WHERE ${eng} IS NULL AND ${tr} IS NOT NULL`;
          const res = await client.query(sql);
          console.log(`  ✓ ${tr} -> ${eng} senkronize edildi (${res.rowCount} satır)`);
        } catch (e) {
          console.error(`  ⚠️  ${tr} -> ${eng} senkronizasyon hatası:`, e.message);
        }
      }
    }

    // 4. Benzersiz kısıtlama
    try {
        await client.query('ALTER TABLE items ADD CONSTRAINT items_name_unique UNIQUE (name)');
        console.log('  ✓ name sütununa UNIQUE kısıtlaması eklendi');
    } catch (e) {
        console.log('  - UNIQUE kısıtlaması durumu:', e.message);
    }

    console.log('✅ İşlem başarıyla tamamlandı.');

  } catch (err) {
    console.error('❌ Genel Hata:', err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

fixSchema();
