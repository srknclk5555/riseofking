const pool = require('./config/database');

async function addMissingFriends() {
  try {
    // Add the missing friends to the friendships table
    const missingFriends = ['1234', '12345'];
    
    for (const friendId of missingFriends) {
      try {
        await pool.query(
          'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          ['5DMENCsdKbQ5DTvv9O7hqrmYwv22', friendId, 'accepted']
        );
        console.log(`Added friendship: 5DMENCsdKbQ5DTvv9O7hqrmYwv22 -> ${friendId}`);
      } catch (err) {
        console.log(`Error adding friendship for ${friendId}:`, err.message);
      }
    }
    
    // Verify the result
    const result = await pool.query(
      'SELECT f.friend_id, u.username, u."mainCharacter" FROM friendships f JOIN users u ON f.friend_id = u.uid WHERE f.user_id = $1',
      ['5DMENCsdKbQ5DTvv9O7hqrmYwv22']
    );
    
    console.log('Updated friends list:');
    console.log(result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addMissingFriends();