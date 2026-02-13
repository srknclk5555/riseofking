const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Mesajlaşma sistemi veritabanı güncellemesi başlıyor...\n');

        // 1. private_messages tablosuna yeni kolonları ekle
        console.log('1️⃣ private_messages tablosu güncelleniyor...');

        // read_at
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='private_messages' AND column_name='read_at') THEN 
          ALTER TABLE private_messages ADD COLUMN read_at TIMESTAMP; 
          RAISE NOTICE 'read_at eklendi';
        END IF;
      END $$;
    `);

        // deleted_by_sender
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='private_messages' AND column_name='deleted_by_sender') THEN 
          ALTER TABLE private_messages ADD COLUMN deleted_by_sender BOOLEAN DEFAULT FALSE;
          RAISE NOTICE 'deleted_by_sender eklendi';
        END IF;
      END $$;
    `);

        // deleted_by_receiver
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='private_messages' AND column_name='deleted_by_receiver') THEN 
          ALTER TABLE private_messages ADD COLUMN deleted_by_receiver BOOLEAN DEFAULT FALSE; 
          RAISE NOTICE 'deleted_by_receiver eklendi';
        END IF;
      END $$;
    `);

        // message_type
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='private_messages' AND column_name='message_type') THEN 
          ALTER TABLE private_messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text'; 
          RAISE NOTICE 'message_type eklendi';
        END IF;
      END $$;
    `);

        console.log('✅ private_messages tablosu güncellendi.');

        // 2. blocked_users tablosunu oluştur
        console.log('\n2️⃣ blocked_users tablosu oluşturuluyor...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        blocker_id VARCHAR(100) NOT NULL,
        blocked_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (blocker_id, blocked_id)
      );
    `);

        console.log('✅ blocked_users tablosu hazır.');

        // 3. Kontrol
        console.log('\n📋 Tablo kontrolü:');
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'private_messages' 
      ORDER BY ordinal_position;
    `);
        res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    } catch (e) {
        console.error('❌ Hata:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
