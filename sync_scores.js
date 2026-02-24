const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/config/database');

async function syncScores() {
    const client = await pool.connect();
    try {
        console.log('--- Participation Score Synchronization ---');
        await client.query('BEGIN');

        // 1. Get all runs and their drops to determine point value (10 or 12)
        const runsRes = await client.query(`
            SELECT r.id, 
                   array_agg(i.name) as item_names
            FROM clan_boss_runs r
            LEFT JOIN clan_boss_drops d ON r.id = d.run_id
            LEFT JOIN items i ON d.item_id = i.id
            GROUP BY r.id
        `);

        const runPointsMap = {};
        runsRes.rows.forEach(run => {
            const hasRealDrops = (run.item_names || []).some(name => {
                const dName = (name || '').toLowerCase();
                return dName && !dName.includes('silver bar') && !dName.includes('gold bar') && !dName.includes('golden bar');
            });
            runPointsMap[run.id] = hasRealDrops ? 12 : 10;
        });

        // 2. Calculate expected scores for each user based on participation
        const partsRes = await client.query(`
            SELECT user_id, run_id 
            FROM clan_boss_participants 
            WHERE left_at IS NULL
        `);

        const expectedScores = {};
        partsRes.rows.forEach(p => {
            const points = runPointsMap[p.run_id] || 0;
            expectedScores[p.user_id] = (expectedScores[p.user_id] || 0) + points;
        });

        // 3. Reset ALL scores to 0 first (or just update those needed, but reset is cleaner for full sync)
        console.log('Resetting all scores to 0...');
        await client.query('UPDATE clan_members SET participation_score = 0');

        // 4. Update with calculated scores
        console.log('Applying calculated scores...');
        for (const [userId, score] of Object.entries(expectedScores)) {
            await client.query(`
                UPDATE clan_members 
                SET participation_score = $1 
                WHERE user_id = $2
            `, [score, userId]);
        }

        await client.query('COMMIT');
        console.log('--- Synchronization Complete Successfully ---');

        // Final verification check
        const finalRes = await client.query('SELECT username, participation_score FROM clan_members cm JOIN users u ON cm.user_id = u.uid WHERE cm.participation_score > 0 ORDER BY participation_score DESC');
        console.log('\nUpdated Scores (Top 10):');
        console.table(finalRes.rows.slice(0, 10));

        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

syncScores();
