const pool = require('./config/database');

async function addFriendships() {
  try {
    // Sample friendships for testing
    const friendships = [
      ['5DMENCsdKbQ5DTvv9O7hqrmYwv22', 'go2LuUB80lXKU9DwNKPUNbipNF82'],
      ['5DMENCsdKbQ5DTvv9O7hqrmYwv22', 'Q7tyyrflhIUkUxR9gcUOKdkNDLk1'],
      ['5DMENCsdKbQ5DTvv9O7hqrmYwv22', 'qNXMSkJXpzLZ6ojrrdbC2SaVQk73'],
      ['go2LuUB80lXKU9DwNKPUNbipNF82', '5DMENCsdKbQ5DTvv9O7hqrmYwv22']
    ];

    for (const [userId, friendId] of friendships) {
      try {
        await pool.query(
          'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [userId, friendId, 'accepted']
        );
        console.log(`Added friendship: ${userId} -> ${friendId}`);
      } catch (err) {
        console.log(`Skipping: ${userId} -> ${friendId}`);
      }
    }

    // Check results
    const result = await pool.query(
      "SELECT f.user_id, f.friend_id, u.username, u.\"mainCharacter\" FROM friendships f JOIN users u ON f.friend_id = u.uid WHERE f.user_id = '5DMENCsdKbQ5DTvv9O7hqrmYwv22'"
    );
    
    console.log('Friendships for user 5DMENCsdKbQ5DTvv9O7hqrmYwv22:');
    console.log(result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addFriendships();