const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rise_online_tracker',
  password: 'Seko1234',
  port: 5432,
});

async function testClanMembers() {
  try {
    console.log('=== Clan Üyeleri Testi ===\n');
    
    // 1. Tüm klanları listele
    console.log('1. Tüm klanlar:');
    const clansResult = await pool.query('SELECT id, name, owner_id FROM clans ORDER BY created_at DESC');
    clansResult.rows.forEach(clan => {
      console.log(`   - ID: ${clan.id}, Name: ${clan.name}, Owner: ${clan.owner_id}`);
    });
    
    if (clansResult.rows.length === 0) {
      console.log('   Hiç klan bulunamadı!');
      return;
    }
    
    // 2. İlk clan'ın üyelerini kontrol et
    const firstClan = clansResult.rows[0];
    console.log(`\n2. Klan "${firstClan.name}" (ID: ${firstClan.id}) üyeleri:`);
    
    const membersResult = await pool.query(`
      SELECT 
        u.uid as user_id,
        cm.role,
        cm.joined_at,
        u."mainCharacter" as display_name,
        u.username
      FROM clan_members cm
      LEFT JOIN users u ON cm.user_id = u.uid
      WHERE cm.clan_id = $1
      ORDER BY cm.joined_at ASC
    `, [firstClan.id]);
    
    console.log(`   Toplam ${membersResult.rows.length} üye bulundu:`);
    membersResult.rows.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.display_name || member.username || 'İsimsiz'} (@${member.username}) - Rol: ${member.role} - Katılım: ${member.joined_at}`);
    });
    
    if (membersResult.rows.length === 0) {
      console.log('   Bu klana hiç üye eklenmemiş!');
    }
    
    // 3. Clan members tablosunu kontrol et
    console.log('\n3. Clan members tablosu durumu:');
    const cmCount = await pool.query('SELECT COUNT(*) as count FROM clan_members');
    console.log(`   Toplam clan_member kaydı: ${cmCount.rows[0].count}`);
    
    if (cmCount.rows[0].count > 0) {
      const sampleMembers = await pool.query('SELECT * FROM clan_members LIMIT 3');
      console.log('   Örnek kayıtlar:');
      sampleMembers.rows.forEach(member => {
        console.log(`     Clan: ${member.clan_id}, User: ${member.user_id}, Role: ${member.role}`);
      });
    }
    
  } catch (error) {
    console.error('Test sırasında hata oluştu:', error);
  } finally {
    await pool.end();
  }
}

testClanMembers();