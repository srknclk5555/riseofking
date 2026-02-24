const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/config/database');

async function verifyAndFix() {
    try {
        console.log('--- DB Score Verification ---');
        console.log('DB URL:', process.env.DATABASE_URL ? 'Neon' : 'Local');

        // 1. Check current score for astral1
        const res = await pool.query(`
            SELECT cm.user_id, cm.participation_score, u.username 
            FROM clan_members cm 
            JOIN users u ON cm.user_id = u.uid 
            WHERE u.username = 'astral1'
        `);

        if (res.rows.length === 0) {
            console.log('User astral1 not found in clan_members table.');
        } else {
            console.log(`Current score for astral1: ${res.rows[0].participation_score}`);

            if (res.rows[0].participation_score !== 0) {
                console.log('Score is NOT 0. Resetting to 0...');
                await pool.query(`
                    UPDATE clan_members 
                    SET participation_score = 0 
                    WHERE user_id = $1
                `, [res.rows[0].user_id]);
                console.log('Score successfully reset to 0.');
            } else {
                console.log('Score is already 0 in database.');
            }
        }

        // 2. Check for any other negative scores
        const negRes = await pool.query('SELECT user_id, participation_score FROM clan_members WHERE participation_score < 0');
        if (negRes.rows.length > 0) {
            console.log(`Found ${negRes.rows.length} members with negative scores. Resetting them to 0...`);
            await pool.query('UPDATE clan_members SET participation_score = 0 WHERE participation_score < 0');
            console.log('Negative scores reset to 0.');
        } else {
            console.log('No other negative scores found.');
        }

        console.log('--- Done ---');
        process.exit(0);
    } catch (err) {
        console.error('Error during verification:', err);
        process.exit(1);
    }
}

verifyAndFix();
