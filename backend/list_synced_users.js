const pool = require('./config/database');

async function listSyncedUsers() {
  try {
    const result = await pool.query(`
      SELECT uid, username, "mainCharacter" 
      FROM users 
      WHERE username IS NOT NULL 
      ORDER BY username
    `);
    
    console.log('Users in PostgreSQL:');
    result.rows.forEach(u => {
      console.log(`- ${u.username}: ${u.uid} (${u.mainCharacter || 'no character'})`);
    });
    
    console.log(`\nTotal users: ${result.rows.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listSyncedUsers();