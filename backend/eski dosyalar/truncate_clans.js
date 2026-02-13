const pool = require('./config/database');

async function truncateClans() {
  try {
    console.log('Starting clans table cleanup...');
    
    // First, delete from clan_members (due to foreign key constraint)
    const memberResult = await pool.query('DELETE FROM clan_members RETURNING *');
    console.log(`Deleted ${memberResult.rowCount} records from clan_members`);
    
    // Then delete from clans table
    const clanResult = await pool.query('DELETE FROM clans RETURNING *');
    console.log(`Deleted ${clanResult.rowCount} records from clans`);
    
    // Verify tables are empty
    const clanCount = await pool.query('SELECT COUNT(*) FROM clans');
    const memberCount = await pool.query('SELECT COUNT(*) FROM clan_members');
    
    console.log(`Remaining clans: ${clanCount.rows[0].count}`);
    console.log(`Remaining clan members: ${memberCount.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

truncateClans();