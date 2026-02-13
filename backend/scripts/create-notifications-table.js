const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function createNotificationsTable() {
  try {
    console.log('🔄 Notifications tablosu oluşturuluyor...');
    
    // Eski tabloyu sil
    await pool.query('DROP TABLE IF EXISTS notifications');
    console.log('✅ Eski notifications tablosu silindi');
    
    // Yeni tabloyu oluştur
    const createTableQuery = `
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        receiver_id VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        text TEXT,
        related_id VARCHAR(100),
        read BOOLEAN DEFAULT FALSE,
        type VARCHAR(50) DEFAULT 'general',
        priority VARCHAR(20) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Yeni notifications tablosu oluşturuldu');
    
    // Index'leri oluştur
    await pool.query('CREATE INDEX idx_notifications_receiver_id ON notifications(receiver_id)');
    await pool.query('CREATE INDEX idx_notifications_read ON notifications(read)');
    await pool.query('CREATE INDEX idx_notifications_created_at ON notifications(created_at)');
    await pool.query('CREATE INDEX idx_notifications_type ON notifications(type)');
    console.log('✅ Notifications indexleri oluşturuldu');
    
    // Örnek veriler ekle
    const sampleNotifications = [
      {
        receiver_id: 'user123',
        title: 'Yeni Farm Başladı',
        text: 'Prontera Fields - Poring slotunda yeni farm kaydı açıldı. (FARM-001)',
        related_id: '1',
        read: false,
        type: 'farm_created'
      },
      {
        receiver_id: 'user456',
        title: 'Farma Eklendiniz',
        text: 'Payon Forest (Willow) farmına eklendiniz.',
        related_id: '2',
        read: true,
        type: 'farm_invitation'
      },
      {
        receiver_id: 'user789',
        title: 'Satış Yapıldı!',
        text: 'FARM-002 numaralı farmda item satıldı. Yeni pay durumu: 1750c. Tıkla ve kontrol et!',
        related_id: '2',
        read: false,
        type: 'sale_notification'
      }
    ];
    
    for (const notif of sampleNotifications) {
      await pool.query(`
        INSERT INTO notifications (
          receiver_id, title, text, related_id, read, type
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        notif.receiver_id, notif.title, notif.text, notif.related_id, notif.read, notif.type
      ]);
    }
    
    console.log('✅ Örnek notification verileri eklendi');
    
    // Tablo yapısını göster
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Notifications tablosu yapısı:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    await pool.end();
    console.log('\n🎉 Notifications tablosu başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Notifications tablosu oluşturma hatası:', error);
  }
}

createNotificationsTable();