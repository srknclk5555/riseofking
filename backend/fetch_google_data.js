const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findData() {
  const client = await pool.connect();
  try {
    // 1. Find a clan with members
    const topClansRes = await client.query(`
        SELECT c.id, c.name, COUNT(cm.user_id) as mc 
        FROM clans c 
        JOIN clan_members cm ON c.id = cm.clan_id 
        GROUP BY c.id, c.name 
        ORDER BY mc DESC LIMIT 1
    `);
    
    if (topClansRes.rows.length === 0) {
        console.log("No clans with members found.");
        return;
    }
    
    const clan = topClansRes.rows[0];
    const clanId = clan.id;
    console.log("Picking Clan:", clan.name, "(", clanId, ")");

    // 2. Fetch detailed data for this clan
    const members = await client.query(`
      SELECT cm.*, u.username, u.profile 
      FROM clan_members cm 
      JOIN users u ON cm.user_id::TEXT = u.id::TEXT 
      WHERE cm.clan_id::TEXT = $1
    `, [clanId.toString()]);
    
    // 3. Boss Runs
    const bossRuns = await client.query("SELECT * FROM clan_boss_runs WHERE clan_id::TEXT = $1 ORDER BY run_date DESC LIMIT 10", [clanId.toString()]);
    
    // 4. Treasury and Bank
    const treasury = await client.query("SELECT * FROM clan_balances WHERE clan_id::TEXT = $1", [clanId.toString()]);
    const items = await client.query("SELECT * FROM clan_bank_items WHERE clan_id::TEXT = $1", [clanId.toString()]);
    const sold = await client.query("SELECT * FROM clan_bank_sold WHERE clan_id::TEXT = $1 ORDER BY sold_at DESC LIMIT 10", [clanId.toString()]);

    const data = {
      clan,
      members: members.rows,
      bossRuns: bossRuns.rows,
      treasury: treasury.rows[0],
      bankItems: items.rows,
      soldItems: sold.rows
    };

    console.log("--- START DATA ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("--- END DATA ---");

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

findData();
