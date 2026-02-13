const pool = require('./config/database');

async function debugQuery() {
  const userId = '5DMENCsdKbQ5DTvv9O7hqrmYwv22';
  
  console.log('Testing the exact query from getAvailableUsers function...');
  
  try {
    // Execute the exact same query as in getAvailableUsers
    const result = await pool.query(`
      SELECT f.friend_id as uid, u."mainCharacter" as nickname, u.username
       FROM friendships f
       JOIN users u ON f.friend_id = u.uid
       WHERE f.user_id = $1
         AND f.status = 'accepted'
         AND u.username IS NOT NULL
         AND TRIM(u.username) != ''
         AND NOT EXISTS (
           SELECT 1 FROM clan_members cm WHERE cm.user_id = u.uid
         )
       LIMIT 100
    `, [userId]);
    
    console.log('Query result for user', userId + ':');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Let's also check the friends without the clan membership filter
    const friendsWithoutClanFilter = await pool.query(`
      SELECT f.friend_id as uid, u."mainCharacter" as nickname, u.username
       FROM friendships f
       JOIN users u ON f.friend_id = u.uid
       WHERE f.user_id = $1
         AND f.status = 'accepted'
         AND u.username IS NOT NULL
         AND TRIM(u.username) != ''
    `, [userId]);
    
    console.log('\nAll friends (without clan membership filter):');
    console.log(JSON.stringify(friendsWithoutClanFilter.rows, null, 2));
    
    // Check if any of these friends are in clans
    if (friendsWithoutClanFilter.rows.length > 0) {
      const friendIds = friendsWithoutClanFilter.rows.map(row => row.uid);
      const clanCheck = await pool.query(
        `SELECT user_id FROM clan_members WHERE user_id = ANY($1)`,
        [friendIds]
      );
      
      console.log('\nFriends who are in clans:', clanCheck.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }
}

debugQuery();