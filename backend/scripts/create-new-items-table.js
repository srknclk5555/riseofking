const pool = require('../config/database');

async function createNewItemsTable() {
  try {
    await pool.query(`
      CREATE TABLE items (
        id SERIAL PRIMARY KEY,
        itemType VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        rarity VARCHAR(50),
        class VARCHAR(50),
        level INTEGER,
        gearScore INTEGER,
        physicalDefenseBonus INTEGER,
        strengthBonus INTEGER,
        dexterityBonus INTEGER,
        intelligenceBonus INTEGER,
        magicBonus INTEGER,
        healthBonus INTEGER,
        hpBonus INTEGER,
        mpBonus INTEGER,
        fireResistance INTEGER,
        iceResistance INTEGER,
        lightningResistance INTEGER,
        poisonResistance INTEGER,
        holyResistance INTEGER,
        darkResistance INTEGER,
        daggerDefense INTEGER,
        swordDefense INTEGER,
        maceDefense INTEGER,
        axeDefense INTEGER,
        spearDefense INTEGER,
        bowDefense INTEGER,
        expBonusPercent INTEGER,
        coinBonusPercent INTEGER,
        allMonsterAttackBonusPercent INTEGER,
        fireDamage INTEGER,
        iceDamage INTEGER,
        lightningDamage INTEGER,
        bpPerKillBonus INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ New items table created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await pool.end();
  }
}

createNewItemsTable();