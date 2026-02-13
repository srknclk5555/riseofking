require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Finding foreign key constraints...');
        const result = await client.query(`
      SELECT constraint_name 
      FROM information_schema.key_column_usage 
      WHERE table_name = 'clan_members' 
        AND column_name = 'clan_id' 
        AND constraint_name LIKE '%fkey%'
    `);

        for (const row of result.rows) {
            console.log(`Dropping constraint: ${row.constraint_name}`);
            await client.query(`ALTER TABLE clan_members DROP CONSTRAINT "${row.constraint_name}"`);
        }

        console.log('Changing clans.id to TEXT...');
        await client.query('ALTER TABLE clans ALTER COLUMN id TYPE TEXT');

        console.log('Changing clan_members.clan_id to TEXT...');
        await client.query('ALTER TABLE clan_members ALTER COLUMN clan_id TYPE TEXT');

        console.log('Re-adding foreign key constraint...');
        await client.query('ALTER TABLE clan_members ADD CONSTRAINT clan_members_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE');

        await client.query('COMMIT');
        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

migrate();
