const pool = require('./config/database');
const admin = require('firebase-admin');

// Firebase admin SDK'yı başlat
const serviceAccount = require('./craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixOtherPlayersStructure() {
  try {
    console.log('other_players yapısı Firestore verilerine göre düzeltiliyor...');
    
    // PostgreSQL\'deki tüm kullanıcıları al
    const usersResult = await pool.query(`
      SELECT uid, other_players 
      FROM users 
      WHERE other_players IS NOT NULL 
        AND other_players != '{}'
        AND other_players != 'null'
    `);
    
    console.log(`Toplam ${usersResult.rows.length} kullanıcı bulunuyor.`);
    
    for (const user of usersResult.rows) {
      const userId = user.uid;
      const postgresqlOtherPlayers = user.other_players;
      
      if (!postgresqlOtherPlayers || typeof postgresqlOtherPlayers !== 'object') continue;
      
      // Firestore\'dan kullanıcı verilerini al
      const userDoc = await db.collection('artifacts').doc('rise_online_tracker_app')
        .collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log(`Kullanıcı ${userId} için Firestore verisi bulunamadı.`);
        continue;
      }
      
      const firestoreData = userDoc.data();
      const firestoreOtherPlayers = firestoreData.otherPlayers || {};
      
      let hasChanges = false;
      const updatedOtherPlayers = { ...postgresqlOtherPlayers };
      
      // Firestore'daki verilerle PostgreSQL verilerini eşleştir
      for (const [firestoreKey, firestoreFriend] of Object.entries(firestoreOtherPlayers)) {
        if (firestoreFriend && firestoreFriend.uid) {
          // PostgreSQL'de bu UID'ye sahip olan girdiyi bul
          const postgresqlKey = Object.keys(postgresqlOtherPlayers).find(key => 
            postgresqlOtherPlayers[key].uid === firestoreFriend.uid
          );
          
          if (postgresqlKey) {
            // Nickname'i Firestore'dan al, diğer bilgileri koru
            if (updatedOtherPlayers[postgresqlKey].nickname !== firestoreFriend.nickname) {
              console.log(`Kullanıcı ${userId}: ${firestoreFriend.uid} için nickname '${updatedOtherPlayers[postgresqlKey].nickname}' -> '${firestoreFriend.nickname}' olarak değiştirildi`);
              
              updatedOtherPlayers[postgresqlKey].nickname = firestoreFriend.nickname;
              hasChanges = true;
            }
          }
        }
      }
      
      // Eğer değişiklik varsa veritabanını güncelle
      if (hasChanges) {
        await pool.query(
          'UPDATE users SET other_players = $1 WHERE uid = $2',
          [updatedOtherPlayers, userId]
        );
        console.log(`Kullanıcı ${userId} için other_players güncellendi.`);
      }
    }
    
    console.log('other_players yapısı düzeltme işlemi tamamlandı.');
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  } finally {
    await pool.end();
  }
}

fixOtherPlayersStructure();