const pool = require('./config/database');

async function checkUser654() {
  try {
    const result = await pool.query(`
      SELECT cm.user_id, u.username, c.name as clan_name
      FROM clan_members cm 
      JOIN users u ON cm.user_id = u.uid 
      JOIN clans c ON cm.clan_id = c.id
      WHERE u.username = '654'
    `);
    
    console.log('654 clan status:', result.rows);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUser654();