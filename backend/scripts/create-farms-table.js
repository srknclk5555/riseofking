const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function createFarmsTable() {
  try {
    console.log('🔄 Farms tablosu oluşturuluyor...');
    
    // Eski tabloyu sil
    await pool.query('DROP TABLE IF EXISTS farms');
    console.log('✅ Eski farms tablosu silindi');
    
    // Yeni tabloyu oluştur
    const createTableQuery = `
      CREATE TABLE farms (
        id SERIAL PRIMARY KEY,
        farm_number VARCHAR(20) UNIQUE NOT NULL,
        owner_id VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        duration DECIMAL(5,2),
        location VARCHAR(100),
        mob VARCHAR(100),
        participants JSONB,
        items JSONB,
        total_revenue INTEGER DEFAULT 0,
        share_per_person DECIMAL(10,2) DEFAULT 0,
        type VARCHAR(20) DEFAULT 'PARTY',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Yeni farms tablosu oluşturuldu');
    
    // Index'leri oluştur
    await pool.query('CREATE INDEX idx_farms_owner_id ON farms(owner_id)');
    await pool.query('CREATE INDEX idx_farms_date ON farms(date)');
    await pool.query('CREATE INDEX idx_farms_status ON farms(status)');
    console.log('✅ Farms indexleri oluşturuldu');
    
    // Örnek veriler ekle
    const sampleFarms = [
      {
        farm_number: 'FARM-001',
        owner_id: 'user123',
        date: '2024-01-15',
        duration: 2.5,
        location: 'Prontera Fields',
        mob: 'Poring',
        participants: JSON.stringify([
          { nickname: 'Player1', uid: 'user123', isPaid: true, isOwner: true },
          { nickname: 'Player2', uid: 'user456', isPaid: false, isOwner: false }
        ]),
        items: JSON.stringify([
          { name: 'Jellopy', count: 50, estPrice: 100, realPrice: 95, soldCount: 45, id: 1 },
          { name: 'Apple', count: 25, estPrice: 50, realPrice: 45, soldCount: 20, id: 2 }
        ]),
        total_revenue: 4500,
        share_per_person: 2250
      },
      {
        farm_number: 'FARM-002',
        owner_id: 'user789',
        date: '2024-01-16',
        duration: 3.0,
        location: 'Payon Forest',
        mob: 'Willow',
        participants: JSON.stringify([
          { nickname: 'Player3', uid: 'user789', isPaid: true, isOwner: true },
          { nickname: 'Player4', uid: 'user123', isPaid: true, isOwner: false },
          { nickname: 'Player5', uid: 'user456', isPaid: false, isOwner: false }
        ]),
        items: JSON.stringify([
          { name: 'Fluff', count: 30, estPrice: 150, realPrice: 140, soldCount: 25, id: 3 },
          { name: 'Clover', count: 40, estPrice: 80, realPrice: 75, soldCount: 35, id: 4 }
        ]),
        total_revenue: 5250,
        share_per_person: 1750
      }
    ];
    
    for (const farm of sampleFarms) {
      await pool.query(`
        INSERT INTO farms (
          farm_number, owner_id, date, duration, location, mob, participants, items, 
          total_revenue, share_per_person, type, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        farm.farm_number, farm.owner_id, farm.date, farm.duration, farm.location, farm.mob,
        farm.participants, farm.items, farm.total_revenue, farm.share_per_person, 'PARTY', 'active'
      ]);
    }
    
    console.log('✅ Örnek farm verileri eklendi');
    
    // Tablo yapısını göster
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'farms' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Farms tablosu yapısı:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    await pool.end();
    console.log('\n🎉 Farms tablosu başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Farms tablosu oluşturma hatası:', error);
  }
}

createFarmsTable();