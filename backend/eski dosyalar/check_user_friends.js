const pool = require('./config/database');

async function checkUserFriends() {
  try {
    // Önce tüm kullanıcıları listeleyelim
    const allUsers = await pool.query(`
      SELECT uid, username, other_players 
      FROM users 
      WHERE username IS NOT NULL 
      ORDER BY username
    `);
    
    console.log('All users in database:');
    allUsers.rows.forEach(u => {
      console.log(`- ${u.username}: ${u.uid}`);
    });
    
    console.log('\nChecking user 321 specifically:');
    const user321 = await pool.query(`
      SELECT uid, username, other_players 
      FROM users 
      WHERE username = '321'
    `);
    
    if (user321.rows.length > 0) {
      const user = user321.rows[0];
      console.log('User 321 found:');
      console.log('UID:', user.uid);
      console.log('Other players:', JSON.stringify(user.other_players, null, 2));
      
      // other_players objesindeki değerleri çıkaralım
      if (user.other_players && typeof user.other_players === 'object') {
        const friendIds = Object.values(user.other_players)
          .filter(player => player && player.uid)
          .map(player => player.uid);
        console.log('Friend UIDs:', friendIds);
      }
    } else {
      console.log('User 321 not found in PostgreSQL');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUserFriends();