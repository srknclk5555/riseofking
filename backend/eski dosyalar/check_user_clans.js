const pool = require('./config/database');

async function checkUserOwnedClans() {
  try {
    const result = await pool.query(`
      SELECT id, name, owner_id 
      FROM clans 
      WHERE owner_id = 'OolO4E0Ro1aiX30foMQmD4vGsEj1'
    `);
    
    console.log('321 user owned clans:', result.rows);
    
    // Ayrıca kullanıcıların hangi klanlara üye olduğunu kontrol edelim
    const memberships = await pool.query(`
      SELECT cm.clan_id, c.name as clan_name, cm.user_id, u.username
      FROM clan_members cm
      JOIN clans c ON cm.clan_id = c.id
      JOIN users u ON cm.user_id = u.uid
      WHERE u.username IN ('432', '654', '543', 'aaa', 'aab')
    `);
    
    console.log('Relevant users clan memberships:');
    memberships.rows.forEach(row => {
      console.log(`${row.username} (${row.user_id}) -> ${row.clan_name} (${row.clan_id})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUserOwnedClans();