const pool = require('./config/database');

async function checkFriendships() {
  try {
    const result = await pool.query(
      'SELECT f.friend_id, u.username, u."mainCharacter" FROM friendships f JOIN users u ON f.friend_id = u.uid WHERE f.user_id = $1',
      ['5DMENCsdKbQ5DTvv9O7hqrmYwv22']
    );
    console.log('Friends of 5DMENCsdKbQ5DTvv9O7hqrmYwv22:', result.rows);
    
    // Also check who has this user as friend
    const reverseResult = await pool.query(
      'SELECT f.user_id, u.username, u."mainCharacter" FROM friendships f JOIN users u ON f.user_id = u.uid WHERE f.friend_id = $1',
      ['5DMENCsdKbQ5DTvv9O7hqrmYwv22']
    );
    console.log('Users who have 5DMENCsdKbQ5DTvv9O7hqrmYwv22 as friend:', reverseResult.rows);
    
    // Check all friendships
    const allResult = await pool.query('SELECT user_id, friend_id FROM friendships LIMIT 20');
    console.log('All friendships (first 20):', allResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkFriendships();