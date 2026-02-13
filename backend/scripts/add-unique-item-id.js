const pool = require('../config/database');

async function addUniqueItemId() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. clan_bank_items tablosuna unique_item_id kolon ekle
    console.log('Adding unique_item_id to clan_bank_items...');
    await client.query(`
      ALTER TABLE clan_bank_items 
      ADD COLUMN IF NOT EXISTS unique_item_id UUID DEFAULT gen_random_uuid() UNIQUE
    `);
    console.log('✓ unique_item_id added to clan_bank_items');

    // 2. clan_bank_sold tablosuna unique_item_id kolon ekle
    console.log('Adding unique_item_id to clan_bank_sold...');
    await client.query(`
      ALTER TABLE clan_bank_sold 
      ADD COLUMN IF NOT EXISTS unique_item_id UUID
    `);
    console.log('✓ unique_item_id added to clan_bank_sold');

    await client.query('COMMIT');
    console.log('\n✓ Migration başarılı!');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration hatası:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

addUniqueItemId();
