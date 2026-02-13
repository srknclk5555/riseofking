const pool = require('./config/database');
const admin = require('firebase-admin');

// Firebase admin SDK'yı başlat
const serviceAccount = require('./craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncFirebaseNicknames() {
  try {
    console.log('Firestore\'daki nickname bilgileri PostgreSQL\'e aktarılıyor...');
    
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
      const otherPlayers = user.other_players;
      
      if (!otherPlayers || typeof otherPlayers !== 'object') continue;
      
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
      const updatedOtherPlayers = { ...otherPlayers };
      
      // Firestore'daki nickname bilgileriyle PostgreSQL verisini güncelle
      for (const [key, friendData] of Object.entries(otherPlayers)) {
        if (firestoreOtherPlayers[key] && firestoreOtherPlayers[key].nickname) {
          const firestoreNickname = firestoreOtherPlayers[key].nickname;
          
          // Eğer PostgreSQL'deki nickname, Firestore'daki nickname ile farklıysa güncelle
          if (friendData.nickname !== firestoreNickname) {
            updatedOtherPlayers[key].nickname = firestoreNickname;
            hasChanges = true;
            console.log(`Kullanıcı ${userId}, ${friendData.uid} için nickname '${friendData.nickname}' -> '${firestoreNickname}' olarak değiştirildi.`);
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
    
    console.log('Firestore nickname senkronizasyon işlemi tamamlandı.');
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  } finally {
    await pool.end();
  }
}

syncFirebaseNicknames();