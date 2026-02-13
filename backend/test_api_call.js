// Test the actual API endpoint to see if it returns correct data
const axios = require('axios');

async function testApiCall() {
  try {
    // We need a valid authentication token to test the endpoint
    // Since we can't easily generate a Firebase token, let's simulate by directly testing our SQL query logic
    
    console.log("Testing API endpoint: http://localhost:5000/api/clans/users/available-for-clan");
    console.log("Note: This will fail due to lack of authentication token");
    
    // Attempt the call anyway to see what happens
    const response = await axios.get('http://localhost:5000/api/clans/users/available-for-clan', {
      headers: {
        'Authorization': 'Bearer dummy-token'  // This will likely fail
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.log('Expected error (due to auth failure):', error.response?.status, error.response?.data);
    
    // Since direct API call won't work without valid token, let's test our SQL query directly
    console.log('\nTesting SQL query directly instead...');
    const pool = require('./config/database');
    
    // Test the exact query from getAvailableUsers function
    const userId = '5DMENCsdKbQ5DTvv9O7hqrmYwv22'; // Test user
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
    
    console.log('Direct SQL query result for user', userId + ':');
    console.log(result.rows);
    
    // Also check if any users have clan memberships
    const clanMembers = await pool.query('SELECT user_id FROM clan_members LIMIT 10');
    console.log('Some clan members:', clanMembers.rows);
    
    process.exit(0);
  }
}

testApiCall().catch(console.error);