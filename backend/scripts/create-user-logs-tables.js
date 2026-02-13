const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function createUserLogsTables() {
  try {
    // Gathering logs tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gathering_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        profession VARCHAR(50) NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        count INTEGER DEFAULT 0,
        price INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date, profession, item_name)
      )
    `);

    // Events logs tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        count INTEGER DEFAULT 0,
        price INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date, event_type, item_name)
      )
    `);

    // Index'ler
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_gathering_user_date ON gathering_logs(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_events_user_date ON event_logs(user_id, date);
    `);

    console.log('✅ User logs tabloları oluşturuldu:');
    console.log('- gathering_logs');
    console.log('- event_logs');
    
    // Örnek veriler ekle
    await addSampleData();
    
  } catch (error) {
    console.error('❌ Tablo oluşturma hatası:', error);
  } finally {
    await pool.end();
  }
}

async function addSampleData() {
  try {
    // Örnek gathering logları
    await pool.query(`
      INSERT INTO gathering_logs (user_id, date, profession, item_name, count, price, duration) VALUES
      ('user123', '2024-01-21', 'Mining', 'Iron Ore', 50, 120, 120),
      ('user123', '2024-01-21', 'Woodcutting', 'Oak Logs', 30, 80, 90),
      ('user123', '2024-01-20', 'Fishing', 'Raw Fish', 25, 150, 60)
      ON CONFLICT DO NOTHING
    `);

    // Örnek event logları
    await pool.query(`
      INSERT INTO event_logs (user_id, date, event_type, item_name, count, price, duration) VALUES
      ('user123', '2024-01-21', 'BossEvent', 'Dragon Scale', 5, 5000, 30),
      ('user123', '2024-01-21', 'TreasureHunt', 'Gold Coin', 100, 50, 45),
      ('user123', '2024-01-20', 'Festival', 'Party Hat', 1, 10000, 15)
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Örnek veriler eklendi');
  } catch (error) {
    console.error('❌ Örnek veri ekleme hatası:', error);
  }
}

createUserLogsTables();