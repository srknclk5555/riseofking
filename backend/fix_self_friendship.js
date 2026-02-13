const pool = require('./config/database');

async function fixSelfFriendship() {
  try {
    console.log('Kendi kendine arkadaşlık olan girdiler temizleniyor...');
    
    // 654 kullanıcısını bul
    const userResult = await pool.query(`
      SELECT uid, other_players 
      FROM users 
      WHERE username = '654'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('654 kullanıcısı bulunamadı.');
      return;
    }
    
    const user = userResult.rows[0];
    const otherPlayers = user.other_players;
    
    if (!otherPlayers || typeof otherPlayers !== 'object') {
      console.log('654 kullanıcısının other_players verisi yok.');
      return;
    }
    
    console.log('Mevcut other_players:');
    console.log(JSON.stringify(otherPlayers, null, 2));
    
    // Kendi kendine arkadaş olan girdiyi bul ve sil
    const updatedOtherPlayers = {};
    let playerIndex = 0;
    
    for (const [key, friendData] of Object.entries(otherPlayers)) {
      // Kendi UID'siyle eşleşen girdiyi atla
      if (friendData.uid !== user.uid) {
        updatedOtherPlayers[`player_${playerIndex}`] = friendData;
        playerIndex++;
      } else {
        console.log(`Kendi kendine arkadaşlık girdisi siliniyor: ${key} -> ${friendData.uid}`);
      }
    }
    
    // Veritabanını güncelle
    if (playerIndex < Object.keys(otherPlayers).length) {
      await pool.query(
        'UPDATE users SET other_players = $1 WHERE uid = $2',
        [updatedOtherPlayers, user.uid]
      );
      console.log('✓ 654 kullanıcısının kendi kendine arkadaşlık girdisi silindi.');
      console.log('Yeni other_players:');
      console.log(JSON.stringify(updatedOtherPlayers, null, 2));
    } else {
      console.log('Kendi kendine arkadaşlık girdisi bulunamadı.');
    }
    
  } catch (error) {
    console.error('Hata oluştu:', error.message);
  } finally {
    await pool.end();
  }
}

fixSelfFriendship();