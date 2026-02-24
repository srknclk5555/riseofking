const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/config/database');

async function auditScores() {
    try {
        console.log('--- Participation Score Audit ---');

        // 1. Get all runs and their drops to determine point value (10 or 12)
        const runsRes = await pool.query(`
            SELECT r.id, r.clan_id, 
                   array_agg(i.name) as item_names
            FROM clan_boss_runs r
            LEFT JOIN clan_boss_drops d ON r.id = d.run_id
            LEFT JOIN items i ON d.item_id = i.id
            GROUP BY r.id, r.clan_id
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
        const partsRes = await pool.query(`
            SELECT user_id, run_id 
            FROM clan_boss_participants 
            WHERE left_at IS NULL
        `);

        const expectedScores = {};
        partsRes.rows.forEach(p => {
            const points = runPointsMap[p.run_id] || 0;
            expectedScores[p.user_id] = (expectedScores[p.user_id] || 0) + points;
        });

        // 3. Get current stored scores and member info
        const membersRes = await pool.query(`
            SELECT cm.user_id, cm.clan_id, cm.participation_score, u.username, u."mainCharacter" as char_name
            FROM clan_members cm
            JOIN users u ON cm.user_id = u.uid
            WHERE cm.status = 'active'
        `);

        console.log('\nAudit Report:');
        console.log('------------------------------------------------------------------------------------------------');
        console.log(`${'Username'.padEnd(15)} | ${'Current DB'.padEnd(12)} | ${'Calculated'.padEnd(12)} | ${'Diff'.padEnd(10)} | ${'Status'}`);
        console.log('------------------------------------------------------------------------------------------------');

        const discrepancies = [];

        membersRes.rows.forEach(m => {
            const current = m.participation_score;
            const expected = expectedScores[m.user_id] || 0;
            const diff = current - expected;
            const status = diff === 0 ? '✅ MATCH' : '❌ MISMATCH';

            if (diff !== 0) {
                discrepancies.push({ user_id: m.user_id, expected });
            }

            console.log(`${(m.username || 'N/A').padEnd(15)} | ${String(current).padEnd(12)} | ${String(expected).padEnd(12)} | ${String(diff).padEnd(10)} | ${status}`);
        });

        if (discrepancies.length > 0) {
            console.log('\n--- Recommendation ---');
            console.log(`Found ${discrepancies.length} members with score discrepancies.`);
            console.log('Would you like to synchronize the DB scores to match the calculated participation history?');
            // Store for next command if needed
            // await pool.query('UPDATE ...')
        } else {
            console.log('\nAll active member scores are perfectly synchronized with their run participation history.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Audit Error:', err);
        process.exit(1);
    }
}

auditScores();
