const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function createMobsTable() {
  try {
    console.log('🔄 Mobs tablosu oluşturuluyor...');
    
    // Eski tabloyu sil
    await pool.query('DROP TABLE IF EXISTS mobs');
    console.log('✅ Eski mobs tablosu silindi');
    
    // Yeni tabloyu oluştur
    const createTableQuery = `
      CREATE TABLE mobs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(50),
        level INTEGER,
        hp INTEGER,
        attack_power INTEGER,
        defense INTEGER,
        experience_reward INTEGER,
        drop_chance DECIMAL(5,2),
        location_id INTEGER REFERENCES locations(id),
        is_elite BOOLEAN DEFAULT FALSE,
        weakness VARCHAR(50),
        resistance VARCHAR(50),
        spawn_frequency VARCHAR(20),
        ai_behavior VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Yeni mobs tablosu oluşturuldu');
    
    // Örnek veriler ekle
    const sampleMobs = [
      { name: 'Poring', type: 'Normal', level: 1, hp: 25, attack_power: 5, defense: 1, experience_reward: 15, drop_chance: 10.00, location_id: 1, weakness: 'Fire', resistance: 'Ice' },
      { name: 'Smokie', type: 'Normal', level: 5, hp: 45, attack_power: 12, defense: 3, experience_reward: 35, drop_chance: 8.50, location_id: 1, weakness: 'Holy', resistance: 'Dark' },
      { name: 'Willow', type: 'Plant', level: 8, hp: 65, attack_power: 18, defense: 5, experience_reward: 50, drop_chance: 7.25, location_id: 2, weakness: 'Fire', resistance: 'Earth' },
      { name: 'Orc Warrior', type: 'Brute', level: 25, hp: 200, attack_power: 55, defense: 20, experience_reward: 180, drop_chance: 12.75, location_id: 3, weakness: 'Holy', resistance: 'Dark', is_elite: true },
      { name: 'Ice Titan', type: 'Formless', level: 75, hp: 1500, attack_power: 250, defense: 150, experience_reward: 2500, drop_chance: 15.50, location_id: 4, weakness: 'Fire', resistance: 'Ice', is_elite: true }
    ];
    
    for (const mob of sampleMobs) {
      await pool.query(`
        INSERT INTO mobs (
          name, type, level, hp, attack_power, defense, experience_reward, 
          drop_chance, location_id, is_elite, weakness, resistance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        mob.name, mob.type, mob.level, mob.hp, mob.attack_power, mob.defense,
        mob.experience_reward, mob.drop_chance, mob.location_id, mob.is_elite,
        mob.weakness, mob.resistance
      ]);
    }
    
    console.log('✅ Örnek mob verileri eklendi');
    
    // Tablo yapısını göster
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'mobs' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Mobs tablosu yapısı:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    await pool.end();
    console.log('\n🎉 Mobs tablosu başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Mobs tablosu oluşturma hatası:', error);
  }
}

createMobsTable();