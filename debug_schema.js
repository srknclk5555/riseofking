require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

async function checkSchema() {
    try {
        console.log('Environment Loaded:', !!process.env.DB_PASSWORD);

        console.log('\n--- CLANS TABLE COLUMNS ---');
        const clansResult = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clans'");
        clansResult.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

        console.log('\n--- CLAN_MEMBERS TABLE COLUMNS ---');
        const membersResult = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clan_members'");
        membersResult.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));

        console.log('\n--- SAMPLE DATA FROM CLANS ---');
        const sampleClans = await pool.query("SELECT id, name FROM clans LIMIT 5");
        console.table(sampleClans.rows);

        console.log('\n--- SAMPLE DATA FROM CLAN_MEMBERS ---');
        const sampleMembers = await pool.query("SELECT clan_id, user_id, role FROM clan_members LIMIT 5");
        console.table(sampleMembers.rows);

        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
