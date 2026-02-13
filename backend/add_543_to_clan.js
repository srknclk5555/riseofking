const pool = require('./config/database');

async function add543ToClan() {
  try {
    console.log('Adding 543 to comdata clan...');
    
    // Önce comdata clan ID'sini bul
    const clanResult = await pool.query(`
      SELECT id FROM clans WHERE name = 'comdata'
    `);
    
    if (clanResult.rows.length === 0) {
      console.log('Comdata clan not found');
      process.exit(1);
    }
    
    const clanId = clanResult.rows[0].id;
    console.log('Comdata clan ID:', clanId);
    
    // 543 kullanıcısını ekle
    await pool.query(`
      INSERT INTO clan_members (clan_id, user_id, role, joined_at)
      VALUES ($1, $2, 'member', NOW())
      ON CONFLICT (clan_id, user_id) DO NOTHING
    `, [clanId, 'Cii8XGKpIQbiQCfbvskd3xrfxcH3']);
    
    console.log('✅ 543 added to comdata clan successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

add543ToClan();