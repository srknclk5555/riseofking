const pool = require('./config/database');
require('dotenv').config();

async function fixSchema() {
    try {
        console.log('[MIGRATION] Starting local schema fix...');

        // 1. Add missing password_hash column
        console.log('[MIGRATION] Ensuring password_hash column exists...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
                    ALTER TABLE users ADD COLUMN password_hash TEXT;
                    RAISE NOTICE 'Added password_hash column';
                END IF;
            END $$;
        `);

        // 2. Standardize mainCharacter column
        console.log('[MIGRATION] Ensuring mainCharacter column is correctly named...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mainCharacter') THEN
                    ALTER TABLE users ADD COLUMN "mainCharacter" TEXT;
                    RAISE NOTICE 'Added mainCharacter column';
                END IF;
            END $$;
        `);

        // 3. Migrate data from main_character or maincharacter to "mainCharacter" if they exist
        await pool.query(`
            UPDATE users SET "mainCharacter" = COALESCE("mainCharacter", main_character, maincharacter)
            WHERE (main_character IS NOT NULL OR maincharacter IS NOT NULL) AND "mainCharacter" IS NULL;
        `);

        // 4. Standardize created_at and updated_at
        console.log('[MIGRATION] Standardizing created_at and updated_at columns...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_at') THEN
                    ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
                    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        `);

        // Sync createdAt to created_at if it exists
        await pool.query(`
            UPDATE users SET created_at = "createdAt" 
            WHERE "createdAt" IS NOT NULL AND created_at IS NULL;
        `);

        // 5. Consolidate other_players
        console.log('[MIGRATION] Consolidating other_players column...');
        await pool.query(`
            UPDATE users SET other_players = COALESCE(other_players, "otherPlayers", '{}'::jsonb)
            WHERE ("otherPlayers" IS NOT NULL) AND (other_players IS NULL OR other_players::text = '{}');
        `);

        // 6. Ensure UID uniqueness
        console.log('[MIGRATION] Ensuring UID uniqueness...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_uid_unique') THEN
                    ALTER TABLE users ADD CONSTRAINT users_uid_unique UNIQUE (uid);
                    RAISE NOTICE 'Added unique constraint to uid';
                END IF;
            END $$;
        `);

        console.log('[MIGRATION] SUCCESS! Local schema updated.');
        process.exit(0);
    } catch (err) {
        console.error('[MIGRATION] FAILED:');
        console.error(err.message);
        process.exit(1);
    }
}

fixSchema();
