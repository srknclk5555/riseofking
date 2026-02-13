const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function createMessagesTable() {
  try {
    console.log('🔄 Messages tablosu oluşturuluyor...');
    
    // Eski tabloyu sil
    await pool.query('DROP TABLE IF EXISTS private_messages');
    console.log('✅ Eski private_messages tablosu silindi');
    
    // Yeni tabloyu oluştur
    const createTableQuery = `
      CREATE TABLE private_messages (
        id SERIAL PRIMARY KEY,
        sender_id VARCHAR(100) NOT NULL,
        receiver_id VARCHAR(100) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read BOOLEAN DEFAULT FALSE,
        participants TEXT[] NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Yeni private_messages tablosu oluşturuldu');
    
    // Index'leri oluştur
    await pool.query('CREATE INDEX idx_messages_sender_id ON private_messages(sender_id)');
    await pool.query('CREATE INDEX idx_messages_receiver_id ON private_messages(receiver_id)');
    await pool.query('CREATE INDEX idx_messages_participants ON private_messages USING GIN(participants)');
    await pool.query('CREATE INDEX idx_messages_created_at ON private_messages(created_at)');
    await pool.query('CREATE INDEX idx_messages_read ON private_messages(read)');
    console.log('✅ Messages indexleri oluşturuldu');
    
    // Örnek veriler ekle
    const sampleMessages = [
      {
        sender_id: 'user123',
        receiver_id: 'user456',
        text: 'Merhaba, nasıl gidiyor?',
        read: false,
        participants: ['user123', 'user456']
      },
      {
        sender_id: 'user456',
        receiver_id: 'user123',
        text: 'İyiyim teşekkürler, senden?',
        read: true,
        participants: ['user123', 'user456']
      },
      {
        sender_id: 'user789',
        receiver_id: 'user123',
        text: 'Farm için hazır mısın?',
        read: false,
        participants: ['user123', 'user789']
      }
    ];
    
    for (const message of sampleMessages) {
      await pool.query(`
        INSERT INTO private_messages (
          sender_id, receiver_id, text, read, participants
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        message.sender_id, 
        message.receiver_id, 
        message.text, 
        message.read, 
        message.participants
      ]);
    }
    
    console.log('✅ Örnek mesaj verileri eklendi');
    
    // Tablo yapısını göster
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'private_messages' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Private_messages tablosu yapısı:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    await pool.end();
    console.log('\n🎉 Private_messages tablosu başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Private_messages tablosu oluşturma hatası:', error);
  }
}

createMessagesTable();