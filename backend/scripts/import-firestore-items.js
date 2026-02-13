const { Pool } = require('pg');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase servis hesabı
const serviceAccount = require('../craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');

// Firebase başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://craft-71422.firebaseio.com'
});

const db = admin.firestore();

// PostgreSQL bağlantı
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function importItemsFromFirestore() {
  try {
    console.log('🔄 Firestore items koleksiyonu aktarılıyor...');
    
    // Firestore'dan items koleksiyonunu çek
    const itemsSnapshot = await db.collection('artifacts')
                                 .doc('rise_online_tracker_app')
                                 .collection('public')
                                 .doc('data')
                                 .collection('items')
                                 .get();
    
    console.log(`📊 Toplam ${itemsSnapshot.size} item bulundu`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    // Her item için işlem yap
    for (const doc of itemsSnapshot.docs) {
      const item = doc.data();
      
      try {
        // PostgreSQL'e ekle (item_type kolonu kontrolü ile)
        const columns = ['name', 'rarity', 'level', 'gear_score', 'class', 'bonuses', 'resistances'];
        const values = [
          item.name || '',
          item.rarity || null,
          item.level || null,
          item.gearScore || null,
          item.class || null,
          item.bonuses ? JSON.stringify(item.bonuses) : null,
          item.resistances ? JSON.stringify(item.resistances) : null
        ];
        
        // item_type varsa ekle
        if (item.itemType !== undefined) {
          columns.push('item_type');
          values.push(item.itemType || null);
        }
        
        // Placeholder'lar için $1, $2, ... oluştur
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        
        const query = `
          INSERT INTO items (${columns.join(', ')}) 
          VALUES (${placeholders}) 
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length > 0) {
          importedCount++;
          console.log(`✅ ${item.name} aktarıldı (ID: ${result.rows[0].id})`);
        } else {
          skippedCount++;
          console.log(`➡️ ${item.name} zaten mevcut, atlandı`);
        }
        
      } catch (insertError) {
        console.error(`❌ ${item.name} aktarılırken hata:`, insertError.message);
      }
    }
    
    console.log(`\n🎉 Aktarım tamamlandı!`);
    console.log(`✅ Başarıyla aktarılan: ${importedCount} item`);
    console.log(`➡️ Atlanan (zaten var): ${skippedCount} item`);
    console.log(`📊 Toplam Firestore item: ${itemsSnapshot.size}`);
    
    // Final kontrol
    const finalCount = await pool.query('SELECT COUNT(*) FROM items');
    console.log(`📈 PostgreSQL items sayısı: ${finalCount.rows[0].count}`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Aktarım sırasında genel hata:', error);
  }
}

// Scripti çalıştır
importItemsFromFirestore();