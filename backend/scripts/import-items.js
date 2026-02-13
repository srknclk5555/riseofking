// backend/scripts/import-items.js

// 1. Gerekli kütüphaneleri import ediyoruz
const { Pool } = require('pg');
const admin = require('firebase-admin');
require('dotenv').config();

// 2. PostgreSQL bağlantısı kuruyoruz
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

// 3. Firebase servis hesabı dosyasının yolunu belirtiyoruz
// İndirdiğiniz JSON dosyasının yolunu buraya yazın
const serviceAccount = require('../craft-71422-firebase-adminsdk-fbsvc-4b80b140da'); // Bu dosya adını kendi dosyanıza göre değiştirin

// 4. Firebase'i başlatıyoruz
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://craft-71422.firebaseio.com' // Firebase projenizin URL'si
});

// 5. Firestore veritabanı referansı
const db = admin.firestore();

// 6. Ana aktarım fonksiyonu
async function importItemsFromFirestore() {
  try {
    console.log('Items aktarımı başlatılıyor...');
    
    // 7. Firestore'dan items collection'ını çekiyoruz
    // Uygulamanızdaki gerçek collection yolunu kullanın
    const itemsSnapshot = await db.collection('artifacts')
                                 .doc('rise_online_tracker_app')
                                 .collection('public')
                                 .doc('data')
                                 .collection('items')
                                 .get();
    
    console.log(`Toplam ${itemsSnapshot.size} item bulundu`);
    
    let importedCount = 0;
    
    // 8. Her bir item için döngü
    for (const doc of itemsSnapshot.docs) {
      const item = doc.data();
      
      try {
        // 9. PostgreSQL'e item'ı ekliyoruz
        const result = await pool.query(
          `INSERT INTO items (name, rarity, level, gear_score, class, bonuses, resistances, item_type) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (name) DO NOTHING
           RETURNING id`,
          [
            item.name || '',                    // Item adı
            item.rarity || null,               // Nadirlik seviyesi
            item.level || null,                // Level
            item.gearScore || null,            // Gear score
            item.class || null,                // Sınıf
            item.bonuses ? JSON.stringify(item.bonuses) : null,     // Bonuslar (JSON)
            item.resistances ? JSON.stringify(item.resistances) : null, // Dirençler (JSON)
            item.itemType || null              // Item tipi
          ]
        );
        
        if (result.rows.length > 0) {
          importedCount++;
          console.log(`✓ ${item.name} aktarıldı (ID: ${result.rows[0].id})`);
        } else {
          console.log(`→ ${item.name} zaten mevcut, atlandı`);
        }
        
      } catch (insertError) {
        console.error(`✗ ${item.name} aktarılırken hata:`, insertError.message);
      }
    }
    
    console.log(`\n✅ Aktarım tamamlandı! ${importedCount} item başarıyla aktarıldı.`);
    
    // 10. Bağlantıları kapatıyoruz
    await pool.end();
    
  } catch (error) {
    console.error('❌ Aktarım sırasında genel hata:', error);
  }
}

// 11. Fonksiyonu çalıştır
importItemsFromFirestore();