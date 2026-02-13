const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

// Örnek item verileri
const sampleItems = [
  {
    name: "Unique Sword of Valor",
    rarity: "Unique",
    level: 50,
    gear_score: 1200,
    class: "Warrior",
    bonuses: { 
      strength: 50, 
      critical: 15,
      physicalAttack: 80
    },
    resistances: { 
      fire: 20, 
      ice: 10,
      lightning: 5
    },
    item_type: "Weapon"
  },
  {
    name: "Epic Dragon Helm",
    rarity: "Epic",
    level: 45,
    gear_score: 800,
    class: "All",
    bonuses: { 
      defense: 30, 
      hp: 100,
      magicDefense: 25
    },
    resistances: { 
      lightning: 15, 
      poison: 25,
      darkness: 10
    },
    item_type: "Armor"
  },
  {
    name: "Rare Phoenix Ring",
    rarity: "Rare",
    level: 40,
    gear_score: 600,
    class: "Mage",
    bonuses: { 
      intelligence: 40, 
      mp: 80,
      magicAttack: 60
    },
    resistances: { 
      fire: 30, 
      ice: -10,
      holy: 15
    },
    item_type: "Accessory"
  },
  {
    name: "Magic Crystal Shield",
    rarity: "Magic",
    level: 35,
    gear_score: 450,
    class: "Paladin",
    bonuses: { 
      defense: 45, 
      hp: 120,
      block: 20
    },
    resistances: { 
      physical: 25, 
      magical: 20,
      earth: 15
    },
    item_type: "Shield"
  }
];

async function importSampleItems() {
  try {
    console.log('🔄 Örnek item verileri aktarılıyor...');
    
    let importedCount = 0;
    
    for (const item of sampleItems) {
      try {
        const result = await pool.query(
          `INSERT INTO items (name, rarity, level, gear_score, class, bonuses, resistances, item_type) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (name) DO NOTHING
           RETURNING id`,
          [
            item.name,
            item.rarity,
            item.level,
            item.gear_score,
            item.class,
            JSON.stringify(item.bonuses),
            JSON.stringify(item.resistances),
            item.item_type
          ]
        );
        
        if (result.rows.length > 0) {
          importedCount++;
          console.log(`✅ ${item.name} eklendi (ID: ${result.rows[0].id})`);
        } else {
          console.log(`➡️ ${item.name} zaten mevcut, atlandı`);
        }
        
      } catch (insertError) {
        console.error(`❌ ${item.name} eklenirken hata:`, insertError.message);
      }
    }
    
    console.log(`\n🎉 Aktarım tamamlandı! ${importedCount} item başarıyla eklendi.`);
    
    // Eklenen item'ları göster
    const checkResult = await pool.query('SELECT COUNT(*) FROM items');
    console.log(`📊 Toplam items sayısı: ${checkResult.rows[0].count}`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Aktarım sırasında genel hata:', error);
  }
}

// Scripti çalıştır
importSampleItems();