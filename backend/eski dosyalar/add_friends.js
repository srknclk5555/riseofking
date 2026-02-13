const pool = require('./config/database');

async function addFriendRelations() {
  try {
    console.log('Adding friend relations...');
    
    // Tüm kullanıcıları al
    const allUsers = await pool.query(`
      SELECT uid, username 
      FROM users 
      WHERE username IS NOT NULL
    `);
    
    console.log('Available users:');
    allUsers.rows.forEach(u => {
      console.log(`- ${u.username}: ${u.uid}`);
    });
    
    // 321 kullanıcısını bul
    const user321 = allUsers.rows.find(u => u.username === '321');
    if (!user321) {
      console.log('User 321 not found');
      process.exit(1);
    }
    
    console.log(`\nAdding friends to user 321 (${user321.uid})`);
    
    // Diğer tüm kullanıcıları arkadaş olarak ekle
    const otherUsers = allUsers.rows.filter(u => u.username !== '321');
    const otherPlayersObj = {};
    
    otherUsers.forEach((user, index) => {
      otherPlayersObj[`player_${index}`] = {
        uid: user.uid,
        username: user.username
      };
    });
    
    console.log('Friends to add:', JSON.stringify(otherPlayersObj, null, 2));
    
    // Veritabanını güncelle
    await pool.query(
      `UPDATE users 
       SET other_players = $1 
       WHERE uid = $2`,
      [otherPlayersObj, user321.uid]
    );
    
    console.log('✅ Friend relations added successfully');
    
    // Kontrol edelim
    const updatedUser = await pool.query(
      `SELECT other_players FROM users WHERE uid = $1`,
      [user321.uid]
    );
    
    console.log('Updated other_players:', JSON.stringify(updatedUser.rows[0].other_players, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addFriendRelations();