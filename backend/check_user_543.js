const pool = require('./config/database');

async function checkUser543() {
  try {
    // 543 kullanıcısının bilgilerini kontrol et
    const result = await pool.query(`
      SELECT uid, username, "mainCharacter" 
      FROM users 
      WHERE username = '543'
    `);
    
    console.log('543 user info:');
    console.log(result.rows);
    
    // 543 kullanıcısının klana üyelik durumunu kontrol et
    const clanResult = await pool.query(`
      SELECT cm.user_id, u.username, c.name as clan_name
      FROM clan_members cm 
      JOIN users u ON cm.user_id = u.uid 
      JOIN clans c ON cm.clan_id = c.id
      WHERE u.username = '543'
    `);
    
    console.log('\n543 clan membership:');
    console.log(clanResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUser543();