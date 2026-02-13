const pool = require('./config/database');

async function updateOtherPlayersNickname() {
  try {
    console.log('other_players alanlarında nickname bilgileri güncelleniyor...');
    
    // Kullanıcıları al ve diğer oyuncuların bilgilerini güncelle
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
      
      let hasChanges = false;
      const updatedOtherPlayers = { ...otherPlayers };
      
      // Her bir diğer oyuncu için nickname bilgisini kontrol et ve ekle
      for (const [key, friendData] of Object.entries(otherPlayers)) {
        if (friendData && friendData.uid && !friendData.nickname) {
          // Bu arkadaşın kullanıcı adını al ve nickname olarak ata
          try {
            const friendUserResult = await pool.query(
              'SELECT username FROM users WHERE uid = $1',
              [friendData.uid]
            );
            
            if (friendUserResult.rows.length > 0) {
              const friendUsername = friendUserResult.rows[0].username;
              if (friendUsername) {
                updatedOtherPlayers[key].nickname = friendUsername;
                hasChanges = true;
                console.log(`Kullanıcı ${userId} için arkadaş ${friendData.uid} için nickname eklendi: ${friendUsername}`);
              }
            }
          } catch (error) {
            console.error(`Arkadaş bilgisi alınırken hata: ${friendData.uid}`, error.message);
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
    
    console.log('other_players nickname güncelleme işlemi tamamlandı.');
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  } finally {
    await pool.end();
  }
}

updateOtherPlayersNickname();