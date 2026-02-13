const pool = require('./config/database');

async function listUsers() {
  try {
    console.log('Listing users from PostgreSQL...');
    
    const result = await pool.query(`
      SELECT uid, username, "mainCharacter" 
      FROM users 
      WHERE username IS NOT NULL 
      LIMIT 10
    `);
    
    console.log('Users in PostgreSQL:');
    result.rows.forEach(u => {
      console.log(`- ${u.uid}: ${u.username} (${u.mainCharacter || 'no character'})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listUsers();