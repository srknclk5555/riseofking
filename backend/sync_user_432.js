const pool = require('./config/database');
const admin = require('firebase-admin');

// Firebase admin SDK'yı başlat
const serviceAccount = require('./craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncUser432() {
  try {
    const userId = 'xxU9kGJgpIhCACt6P44Pem066S53'; // 432 kullanıcısı
    
    console.log('432 kullanıcısı senkronize ediliyor...');
    
    // Firestore'dan kullanıcı verilerini al
    const userDoc = await db.collection('artifacts').doc('rise_online_tracker_app')
      .collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('432 kullanıcısı için Firestore verisi bulunamadı.');
      return;
    }
    
    const firestoreData = userDoc.data();
    const firestoreOtherPlayers = firestoreData.otherPlayers || {};
    
    console.log('Firebase otherPlayers:');
    console.log(JSON.stringify(firestoreOtherPlayers, null, 2));
    
    // Firestore'daki otherPlayers yapısını PostgreSQL formatına dönüştür
    const postgresqlOtherPlayers = {};
    let playerIndex = 0;
    
    for (const [firestoreKey, firestoreFriend] of Object.entries(firestoreOtherPlayers)) {
      if (firestoreFriend && firestoreFriend.uid) {
        const playerKey = `player_${playerIndex}`;
        
        postgresqlOtherPlayers[playerKey] = {
          uid: firestoreFriend.uid,
          nickname: firestoreFriend.nickname || firestoreFriend.realUsername || 'Bilinmeyen',
          username: firestoreFriend.realUsername || 'Bilinmeyen'
        };
        
        console.log(`  ${playerKey}: ${firestoreFriend.uid} -> nickname: ${postgresqlOtherPlayers[playerKey].nickname}`);
        playerIndex++;
      }
    }
    
    // PostgreSQL'i güncelle
    await pool.query(
      'UPDATE users SET other_players = $1 WHERE uid = $2',
      [postgresqlOtherPlayers, userId]
    );
    
    console.log(`✓ 432 kullanıcısı senkronize edildi. Toplam ${playerIndex} arkadaş.`);
    
    // Kontrol edelim
    const result = await pool.query('SELECT uid, username, other_players FROM users WHERE uid = $1', [userId]);
    if (result.rows.length > 0) {
      console.log('\nPostgreSQL other_players:');
      console.log(JSON.stringify(result.rows[0].other_players, null, 2));
    }
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  } finally {
    await pool.end();
  }
}

syncUser432();