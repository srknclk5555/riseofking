const pool = require('./config/database');
const admin = require('firebase-admin');

// Firebase admin SDK'yı başlat
const serviceAccount = require('./craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncAllFirebaseFriends() {
  try {
    console.log('Tüm kullanıcıların arkadaş listeleri senkronize ediliyor...');
    
    // PostgreSQL\'deki tüm kullanıcıları al
    const usersResult = await pool.query(`
      SELECT uid, username 
      FROM users 
      WHERE username IS NOT NULL 
      ORDER BY username
    `);
    
    console.log(`Toplam ${usersResult.rows.length} kullanıcı bulunuyor.`);
    
    let syncedCount = 0;
    
    for (const user of usersResult.rows) {
      const userId = user.uid;
      const username = user.username;
      
      console.log(`\n--- Kullanıcı ${username} (${userId}) işleniyor ---`);
      
      // Firestore\'dan kullanıcı verilerini al
      const userDoc = await db.collection('artifacts').doc('rise_online_tracker_app')
        .collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log(`Kullanıcı ${username} için Firestore verisi bulunamadı.`);
        continue;
      }
      
      const firestoreData = userDoc.data();
      const firestoreOtherPlayers = firestoreData.otherPlayers || {};
      
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
          
          console.log(`  ${playerKey}: ${firestoreFriend.uid} -> nickname: ${postgresqlOtherPlayers[playerKey].nickname}, username: ${postgresqlOtherPlayers[playerKey].username}`);
          playerIndex++;
        }
      }
      
      // Eğer arkadaş verisi varsa PostgreSQL'e kaydet
      if (Object.keys(postgresqlOtherPlayers).length > 0) {
        await pool.query(
          'UPDATE users SET other_players = $1 WHERE uid = $2',
          [postgresqlOtherPlayers, userId]
        );
        console.log(`✓ Kullanıcı ${username} için ${Object.keys(postgresqlOtherPlayers).length} arkadaş senkronize edildi.`);
        syncedCount++;
      } else {
        console.log(`Kullanıcı ${username} için arkadaş verisi bulunamadı.`);
      }
    }
    
    console.log(`\n=== SENKRONİZASYON TAMAMLANDI ===`);
    console.log(`Toplam ${syncedCount} kullanıcı senkronize edildi.`);
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  } finally {
    await pool.end();
  }
}

syncAllFirebaseFriends();