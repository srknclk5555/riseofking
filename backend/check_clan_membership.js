const pool = require('./config/database');

async function checkClanMembership() {
  try {
    // 654 kullanıcısının klana üyelik durumunu kontrol et
    const result = await pool.query(`
      SELECT cm.user_id, u.username, c.name as clan_name
      FROM clan_members cm 
      JOIN users u ON cm.user_id = u.uid 
      JOIN clans c ON cm.clan_id = c.id
      WHERE u.username = '654'
    `);
    
    console.log('Clan membership for 654:');
    console.log(result.rows);
    
    // Tüm clan üyelerini listele
    const allMembers = await pool.query(`
      SELECT cm.user_id, u.username, c.name as clan_name
      FROM clan_members cm 
      JOIN users u ON cm.user_id = u.uid 
      JOIN clans c ON cm.clan_id = c.id
      ORDER BY c.name, u.username
    `);
    
    console.log('\nAll clan members:');
    allMembers.rows.forEach(m => {
      console.log(`- ${m.username} in clan "${m.clan_name}"`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkClanMembership();