const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function dumpLootMetricDetail() {
  const client = await pool.connect();
  try {
    // 1. Search for Clan
    const clanRes = await client.query("SELECT * FROM clans WHERE name ILIKE 'LootMetric'");
    if (clanRes.rows.length === 0) {
      console.log("Clan 'LootMetric' NOT FOUND.");
      // List all clans just in case
      const allClans = await client.query("SELECT id, name, owner_id FROM clans");
      console.log("All clans in DB:", allClans.rows);
      return;
    }
    
    const clan = clanRes.rows[0];
    const clanId = clan.id;
    console.log("Found Clan 'LootMetric':", clan);

    // 2. Fetch Members
    const membersRes = await client.query(`
      SELECT cm.*, u.username, u.profile 
      FROM clan_members cm 
      JOIN users u ON cm.user_id::TEXT = u.id::TEXT 
      WHERE cm.clan_id::TEXT = $1
    `, [clanId.toString()]);
    console.log("Members:", membersRes.rows.length);

    // 3. Fetch Boss Runs
    const bossRunsRes = await client.query("SELECT * FROM clan_boss_runs WHERE clan_id::TEXT = $1 ORDER BY run_date DESC", [clanId.toString()]);
    console.log("Boss Runs:", bossRunsRes.rows.length);

    // 4. Fetch Bank/Treasury
    const treasuryRes = await client.query("SELECT * FROM clan_balances WHERE clan_id::TEXT = $1", [clanId.toString()]);
    const itemsRes = await client.query("SELECT * FROM clan_bank_items WHERE clan_id::TEXT = $1", [clanId.toString()]);
    const soldRes = await client.query("SELECT * FROM clan_bank_sold WHERE clan_id::TEXT = $1 ORDER BY sold_at DESC", [clanId.toString()]);

    const data = {
      clan,
      members: membersRes.rows,
      bossRuns: bossRunsRes.rows,
      treasury: treasuryRes.rows[0],
      items: itemsRes.rows,
      sold: soldRes.rows
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

dumpLootMetricDetail();
