const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

const COLUMNS = [
  { name: 'item_cesidi', type: 'VARCHAR(100)' },
  { name: 'item_adi', type: 'VARCHAR(255)' },
  { name: 'item_turu', type: 'VARCHAR(50)' },
  { name: 'sinif', type: 'VARCHAR(50)' },
  { name: 'seviye', type: 'INTEGER' },
  { name: 'gear_score', type: 'INTEGER' },
  { name: 'fiziksel_savunma_bonusu', type: 'INTEGER' },
  { name: 'strength_bonus', type: 'INTEGER' },
  { name: 'dexterity_bonus', type: 'INTEGER' },
  { name: 'intelligence_bonus', type: 'INTEGER' },
  { name: 'magic_bonus', type: 'INTEGER' },
  { name: 'health_bonus', type: 'INTEGER' },
  { name: 'hp_bonusu', type: 'INTEGER' },
  { name: 'mp_bonusu', type: 'INTEGER' },
  { name: 'ates_hasari_direnci', type: 'INTEGER' },
  { name: 'buz_hasari_direnci', type: 'INTEGER' },
  { name: 'yildirim_hasari_direnci', type: 'INTEGER' },
  { name: 'zehir_hasari_direnci', type: 'INTEGER' },
  { name: 'kutsal_hasari_direnci', type: 'INTEGER' },
  { name: 'lanet_hasari_direnci', type: 'INTEGER' },
  { name: 'hancer_savunmasi', type: 'INTEGER' },
  { name: 'kilic_savunmasi', type: 'INTEGER' },
  { name: 'topuz_savunmasi', type: 'INTEGER' },
  { name: 'balta_savunmasi', type: 'INTEGER' },
  { name: 'mizrak_savunmasi', type: 'INTEGER' },
  { name: 'yay_savunmasi', type: 'INTEGER' },
  { name: 'exp_bonusu', type: 'DECIMAL(10,2)' },
  { name: 'coin_bonusu', type: 'DECIMAL(10,2)' },
  { name: 'tum_yaratiklara_karsi_saldiri_bonusu', type: 'DECIMAL(10,2)' },
  { name: 'ates_hasari', type: 'INTEGER' },
  { name: 'buz_hasari', type: 'INTEGER' },
  { name: 'yildirim_hasari', type: 'INTEGER' },
  { name: 'oldurme_basina_bp_bonusu', type: 'INTEGER' },
];

async function ensureItemsColumns() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'items'
    `);
    const existing = new Set(tableCheck.rows.map(r => r.column_name));

    if (existing.size === 0) {
      console.log('items tablosu yok, create-items-table.js ile oluşturun.');
      return;
    }

    for (const col of COLUMNS) {
      if (existing.has(col.name)) continue;
      try {
        await client.query(`ALTER TABLE items ADD COLUMN ${col.name} ${col.type}`);
        console.log('  +', col.name);
      } catch (e) {
        if (e.code === '42701') console.log('  (zaten var)', col.name);
        else console.error('  Hata', col.name, e.message);
      }
    }
    console.log('Items sütunları güncellendi.');
  } finally {
    client.release();
    await pool.end();
  }
}

ensureItemsColumns().catch(err => {
  console.error(err);
  process.exit(1);
});
