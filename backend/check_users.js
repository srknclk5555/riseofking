const pool = require('./config/database');

async function checkUsers() {
  try {
    const result = await pool.query('SELECT uid, username, other_players FROM users WHERE other_players IS NOT NULL AND other_players != \'{}\' LIMIT 5');
    console.log('Users with other_players:');
    result.rows.forEach(row => {
      console.log('UID:', row.uid, ', Username:', row.username);
      console.log('Other players:', JSON.stringify(row.other_players, null, 2));
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();