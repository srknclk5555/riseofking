const pool = require('./config/database');

async function fixFriendsList() {
  try {
    console.log('Fixing friends list for user 321...');
    
    // 321 kullanıcısını bul
    const userResult = await pool.query(`
      SELECT uid, username, other_players 
      FROM users 
      WHERE username = '321'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('User 321 not found');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log('Current other_players:');
    console.log(JSON.stringify(user.other_players, null, 2));
    
    // DOĞRU arkadaş listesi (SİZİN VERDİĞİNİZ LİSTEYE GÖRE)
    const correctFriends = {
      "player_0": {
        "uid": "xxU9kGJgpIhCACt6P44Pem066S53",  // 432
        "username": "432"
      },
      "player_1": {
        "uid": "KvVBP4fq1dR6CbdpC6QHEkFoTR53",  // 654
        "username": "654"
      },
      "player_2": {
        "uid": "pz4qb7KjzNT1a6FBEGX96XzuFRy2",  // aaa
        "username": "aaa"
      },
      "player_3": {
        "uid": "Cii8XGKpIQbiQCfbvskd3xrfxcH3",  // 543
        "username": "543"
      },
      "player_4": {
        "uid": "1uWtClx3YRZpFOiq22XXbHIop5B3",  // aab
        "username": "aab"
      }
    };
    
    console.log('\nUpdating to CORRECT friends list:');
    console.log(JSON.stringify(correctFriends, null, 2));
    
    // Veritabanını güncelle
    await pool.query(
      `UPDATE users 
       SET other_players = $1 
       WHERE uid = $2`,
      [correctFriends, user.uid]
    );
    
    console.log('✅ Friends list FIXED successfully');
    
    // Kontrol
    const updatedResult = await pool.query(
      `SELECT other_players FROM users WHERE uid = $1`,
      [user.uid]
    );
    
    console.log('\nUpdated other_players:');
    console.log(JSON.stringify(updatedResult.rows[0].other_players, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixFriendsList();