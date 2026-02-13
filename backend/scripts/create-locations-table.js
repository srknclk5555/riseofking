const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function createLocationsTable() {
  try {
    console.log('🔄 Locations tablosu oluşturuluyor...');
    
    // Locations tablosu için SQL
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(100),
        region VARCHAR(100),
        difficulty_level INTEGER,
        monster_level_range_min INTEGER,
        monster_level_range_max INTEGER,
        drop_rate_multiplier DECIMAL(3,2),
        respawn_time_minutes INTEGER,
        max_players INTEGER,
        is_pvp BOOLEAN DEFAULT FALSE,
        entrance_fee INTEGER,
        special_conditions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Locations tablosu oluşturuldu');
    
    // Varsa örnek veriler ekle
    const sampleLocations = [
      { name: 'Prontera Fields', region: 'Prontera', difficulty_level: 1, monster_level_range_min: 1, monster_level_range_max: 10, drop_rate_multiplier: 1.00, respawn_time_minutes: 5, max_players: 50 },
      { name: 'Payon Forest', region: 'Payon', difficulty_level: 2, monster_level_range_min: 10, monster_level_range_max: 25, drop_rate_multiplier: 1.10, respawn_time_minutes: 8, max_players: 40 },
      { name: 'Geffen Dungeon', region: 'Geffen', difficulty_level: 5, monster_level_range_min: 50, monster_level_range_max: 70, drop_rate_multiplier: 1.50, respawn_time_minutes: 15, max_players: 20, is_pvp: true },
      { name: 'Aldebaran Tundra', region: 'Aldebaran', difficulty_level: 8, monster_level_range_min: 80, monster_level_range_max: 100, drop_rate_multiplier: 2.00, respawn_time_minutes: 20, max_players: 15, entrance_fee: 1000 }
    ];
    
    for (const location of sampleLocations) {
      try {
        await pool.query(`
          INSERT INTO locations (
            name, region, difficulty_level, monster_level_range_min, monster_level_range_max,
            drop_rate_multiplier, respawn_time_minutes, max_players, is_pvp, entrance_fee
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (name) DO NOTHING
        `, [
          location.name, location.region, location.difficulty_level, location.monster_level_range_min,
          location.monster_level_range_max, location.drop_rate_multiplier, location.respawn_time_minutes,
          location.max_players, location.is_pvp, location.entrance_fee
        ]);
      } catch (insertError) {
        console.log(`⚠️ ${location.name} zaten mevcut`);
      }
    }
    
    console.log('✅ Örnek location verileri eklendi');
    
    // Tablo yapısını göster
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Locations tablosu yapısı:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    await pool.end();
    console.log('\n🎉 Locations tablosu başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Locations tablosu oluşturma hatası:', error);
  }
}

createLocationsTable();