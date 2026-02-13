const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

// Basit örnek item verileri (item_type olmadan)
const sampleItems = [
  {
    name: "Test Sword",
    rarity: "Common",
    level: 10,
    gear_score: 100,
    class: "Warrior",
    bonuses: { strength: 5 },
    resistances: { fire: 2 }
  },
  {
    name: "Test Shield",
    rarity: "Common",
    level: 15,
    gear_score: 150,
    class: "All",
    bonuses: { defense: 10 },
    resistances: { physical: 5 }
  }
];

async function addSampleItems() {
  try {
    console.log('🔄 Örnek item verileri ekleniyor...');
    
    for (const item of sampleItems) {
      try {
        const result = await pool.query(
          `INSERT INTO items (name, rarity, level, gear_score, class, bonuses, resistances) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (name) DO NOTHING`,
          [
            item.name,
            item.rarity,
            item.level,
            item.gear_score,
            item.class,
            JSON.stringify(item.bonuses),
            JSON.stringify(item.resistances)
          ]
        );
        console.log(`✅ ${item.name} eklendi`);
      } catch (error) {
        console.error(`❌ ${item.name} eklenirken hata:`, error.message);
      }
    }
    
    console.log('🎉 Örnek veriler eklendi!');
    
    // Kontrol için item sayısını göster
    const countResult = await pool.query('SELECT COUNT(*) FROM items');
    console.log(`📊 Toplam items sayısı: ${countResult.rows[0].count}`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Genel hata:', error);
  }
}

addSampleItems();