const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/config/database');

async function debugResolution() {
    try {
        console.log('--- USERS COLUMNS ---');
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        cols.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));

        console.log('\n--- CLAN MEMBERS COLUMNS ---');
        const cmCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clan_members'
        `);
        cmCols.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));

        console.log('\n--- SAMPLE DATA (1989, 1453, 110) ---');
        const userData = await pool.query(`
            SELECT uid, username, "mainCharacter", main_character, maincharacter 
            FROM users 
            WHERE username IN ('1989', '1453', '110')
        `);
        console.log(JSON.stringify(userData.rows, null, 2));

        console.log('\n--- CLAN MEMBERS DATA (Samsunspor) ---');
        const clan = await pool.query("SELECT id FROM clans WHERE name = 'Samsunspor'");
        if (clan.rows.length > 0) {
            const clanId = clan.rows[0].id;
            const cmData = await pool.query(`
                SELECT cm.*, u.username, u."mainCharacter", u.main_character
                FROM clan_members cm
                LEFT JOIN users u ON cm.user_id = u.uid
                WHERE cm.clan_id = $1
            `, [clanId]);
            console.log(JSON.stringify(cmData.rows, null, 2));
        } else {
            console.log('Clan Samsunspor not found');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

debugResolution();
