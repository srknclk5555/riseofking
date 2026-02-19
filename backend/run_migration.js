const pool = require('./config/database');

const migrationSql = `
-- Drop existing tables to ensure a clean state with correct naming conventions
DROP TABLE IF EXISTS clan_payments;
DROP TABLE IF EXISTS clan_bank_transactions;
DROP TABLE IF EXISTS clan_bank_sold;
DROP TABLE IF EXISTS clan_bank_items;
DROP TABLE IF EXISTS clan_balances;

-- 0. Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. clan_balances (Track total clan gold/money)
CREATE TABLE clan_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id TEXT UNIQUE NOT NULL,
    balance NUMERIC DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. clan_bank_items (Unsold items)
CREATE TABLE clan_bank_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT, -- boss_run_id relation
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    clan_id TEXT NOT NULL,
    user_id TEXT, -- original owner/finder
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'available' -- 'available', 'sold'
);

-- 3. clan_bank_sold (Sold items history)
CREATE TABLE clan_bank_sold (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT,
    clan_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    sold_quantity INTEGER NOT NULL,
    sale_amount NUMERIC NOT NULL,
    sold_by TEXT NOT NULL, -- user_id of clan lead who sold it
    sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    original_user_id TEXT -- who found it in the first place
);

-- 4. clan_bank_transactions (Internal ledger for audit)
CREATE TABLE clan_bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id TEXT NOT NULL,
    user_id TEXT NOT NULL, -- who performed the action
    amount NUMERIC NOT NULL, -- positive for income, negative for expense/payments
    transaction_type TEXT NOT NULL, -- 'item_sold', 'payment_made', 'manual_adjustment'
    description TEXT,
    related_run_id TEXT, -- if applicable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. clan_payments (Payments made to participants)
CREATE TABLE clan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    user_id TEXT NOT NULL, -- participant who received payment
    amount NUMERIC NOT NULL,
    paid_by TEXT NOT NULL, -- admin/lead who paid
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'paid'
);

-- Indices for performance
CREATE INDEX idx_bank_items_clan ON clan_bank_items(clan_id);
CREATE INDEX idx_bank_items_run ON clan_bank_items(run_id);
CREATE INDEX idx_bank_sold_clan ON clan_bank_sold(clan_id);
CREATE INDEX idx_bank_transactions_clan ON clan_bank_transactions(clan_id);
CREATE INDEX idx_payments_clan ON clan_payments(clan_id);
CREATE INDEX idx_payments_run ON clan_payments(run_id);

-- 6. Add participation_score to clan_members if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clan_members' AND column_name='participation_score') THEN
        ALTER TABLE clan_members ADD COLUMN participation_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- 7. clan_acp_donations (ACP Donations tracking)
CREATE TABLE IF NOT EXISTS clan_acp_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acp_clan_user ON clan_acp_donations(clan_id, user_id);
CREATE INDEX IF NOT EXISTS idx_acp_date ON clan_acp_donations(donation_date);
`;

async function runMigration() {
    try {
        console.log('Starting Clean Migration (Drop & Recreate)...');
        await pool.query(migrationSql);
        console.log('✓ Database tables created successfully');
        process.exit(0);
    } catch (err) {
        console.error('✗ Migration failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

runMigration();
