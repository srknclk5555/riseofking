const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
});

async function debugRemove() {
    const clanId = 'EY3JCT';
    const userId = 'pz4qb7KjzNT1a6FBEGX96XzuFRy2';
    const ownerId = 'pz4qb7KjzNT1a6FBEGX96XzuFRy2'; // Assumed owner for test

    console.log('--- DEBUG START ---');
    console.log('Clan ID:', clanId);
    console.log('User ID:', userId);
    console.log('Owner ID:', ownerId);

    try {
        // 1. Check Clan
        const clanResult = await pool.query(
            `SELECT owner_id FROM clans WHERE id = $1`,
            [clanId]
        );
        console.log('Clan Result:', clanResult.rows);

        if (clanResult.rows.length === 0) {
            console.log('Klan bulunamadı');
            return;
        }

        // 2. Check Member
        const memberResult = await pool.query(
            `SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2`,
            [clanId, userId]
        );
        console.log('Member Result:', memberResult.rows);

        if (memberResult.rows.length === 0) {
            console.log('Kullanıcı bu klanın üyesi değil');
            return;
        }

        // 3. Delete (Dry run first if needed, but let's see why it fails)
        console.log('Attempting delete...');
        const deleteResult = await pool.query(
            `DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2 RETURNING *`,
            [clanId, userId]
        );
        console.log('Delete Result:', deleteResult.rows);

    } catch (error) {
        console.error('❌ ERROR DETECTED:', error.message);
        console.error('Full Error:', error);
    } finally {
        await pool.end();
    }
}

debugRemove();
