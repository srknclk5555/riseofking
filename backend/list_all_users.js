const pool = require('./config/database');

async function listAllUsers() {
  try {
    const result = await pool.query('SELECT uid, username FROM users WHERE username IS NOT NULL ORDER BY username');
    console.log('All users in database:');
    result.rows.forEach(row => {
      console.log(`- UID: ${row.uid}, Username: ${row.username}`);
    });
    console.log(`Total users: ${result.rows.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

listAllUsers();