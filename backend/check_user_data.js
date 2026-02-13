const pool = require('./config/database');

async function checkUserData() {
  try {
    const result = await pool.query(
      'SELECT uid, other_players FROM users WHERE uid = $1',
      ['5DMENCsdKbQ5DTvv9O7hqrmYwv22']
    );
    
    console.log('User data for 5DMENCsdKbQ5DTvv9O7hqrmYwv22:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    // Check if this user's friends in other_players match friendships table
    if (result.rows[0] && result.rows[0].other_players) {
      const otherPlayers = result.rows[0].other_players;
      console.log('\nFriends in other_players:');
      for (const [key, friendData] of Object.entries(otherPlayers)) {
        if (friendData && friendData.uid) {
          console.log(`  ${key}: ${friendData.uid} (${friendData.nickname || 'no nickname'})`);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUserData();