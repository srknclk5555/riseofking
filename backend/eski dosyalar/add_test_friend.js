const pool = require('./config/database');

async function addTestFriendship() {
  try {
    await pool.query(
      "INSERT INTO friendships (user_id, friend_id, status) VALUES ('5DMENCsdKbQ5DTvv9O7hqrmYwv22', 'go2LuUB80lXKU9DwNKPUNbipNF82', 'accepted') ON CONFLICT DO NOTHING"
    );
    console.log('Test friendship added');
    
    // Kontrol
    const result = await pool.query(
      "SELECT * FROM friendships WHERE user_id = '5DMENCsdKbQ5DTvv9O7hqrmYwv22'"
    );
    console.log('Friendships found:', result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addTestFriendship();