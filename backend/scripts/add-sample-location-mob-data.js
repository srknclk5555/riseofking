const pool = require('../config/database');

async function addSampleData() {
  try {
    console.log('Örnek konum ve yaratık verileri ekleniyor...');
    
    // Örnek location verileri
    const sampleLocations = [
      { 
        name: 'Dorion Fields', 
        type: 'Field', 
        region: 'Dorion', 
        difficulty_level: 1, 
        monster_level_range_min: 1, 
        monster_level_range_max: 15, 
        drop_rate_multiplier: 1.2,
        respawn_time_minutes: 5, 
        max_players: 50, 
        special_conditions: 'Safe zone during day time'
      },
      { 
        name: 'Death Valley', 
        type: 'Dungeon', 
        region: 'Desert', 
        difficulty_level: 5, 
        monster_level_range_min: 50, 
        monster_level_range_max: 70, 
        drop_rate_multiplier: 2.0,
        respawn_time_minutes: 15, 
        max_players: 20, 
        is_pvp: true,
        entrance_fee: 500,
        special_conditions: 'High level monsters, dangerous area'
      },
      { 
        name: 'Ancient Ruins', 
        type: 'Ruins', 
        region: 'Ancient', 
        difficulty_level: 8, 
        monster_level_range_min: 80, 
        monster_level_range_max: 100, 
        drop_rate_multiplier: 2.5,
        respawn_time_minutes: 20, 
        max_players: 15, 
        is_pvp: false,
        entrance_fee: 1000,
        special_conditions: 'Elite monsters, rare drops'
      }
    ];
    
    // Location verilerini ekle
    for (const location of sampleLocations) {
      try {
        await pool.query(`
          INSERT INTO locations (
            name, type, region, difficulty_level, monster_level_range_min, monster_level_range_max,
            drop_rate_multiplier, respawn_time_minutes, max_players, is_pvp, entrance_fee, special_conditions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (name) DO UPDATE SET
            type = EXCLUDED.type,
            region = EXCLUDED.region,
            difficulty_level = EXCLUDED.difficulty_level,
            monster_level_range_min = EXCLUDED.monster_level_range_min,
            monster_level_range_max = EXCLUDED.monster_level_range_max,
            drop_rate_multiplier = EXCLUDED.drop_rate_multiplier,
            respawn_time_minutes = EXCLUDED.respawn_time_minutes,
            max_players = EXCLUDED.max_players,
            is_pvp = EXCLUDED.is_pvp,
            entrance_fee = EXCLUDED.entrance_fee,
            special_conditions = EXCLUDED.special_conditions
        `, [
          location.name, location.type, location.region, location.difficulty_level,
          location.monster_level_range_min, location.monster_level_range_max,
          location.drop_rate_multiplier, location.respawn_time_minutes,
          location.max_players, location.is_pvp, location.entrance_fee, location.special_conditions
        ]);
        console.log(`${location.name} konumu eklendi/güncellendi!`);
      } catch (err) {
        console.error(`${location.name} konumu eklenirken hata:`, err.message);
      }
    }
    
    // Örnek mob verileri
    const sampleMobs = [
      { 
        name: 'Goblin Warrior', 
        type: 'Brute', 
        level: 15, 
        hp: 150, 
        attack_power: 25, 
        defense: 10, 
        experience_reward: 120, 
        drop_chance: 15.5,
        is_elite: false,
        weakness: 'Fire',
        resistance: 'Earth',
        ai_behavior: 'Aggressive',
        spawn_frequency: 'Common'
      },
      { 
        name: 'Skeleton Archer', 
        type: 'Undead', 
        level: 25, 
        hp: 200, 
        attack_power: 35, 
        defense: 15, 
        experience_reward: 200, 
        drop_chance: 12.0,
        is_elite: false,
        weakness: 'Holy',
        resistance: 'Dark',
        ai_behavior: 'Ranged',
        spawn_frequency: 'Common'
      },
      { 
        name: 'Orc Berserker', 
        type: 'Brute', 
        level: 35, 
        hp: 350, 
        attack_power: 60, 
        defense: 25, 
        experience_reward: 350, 
        drop_chance: 18.0,
        is_elite: true,
        weakness: 'Lightning',
        resistance: 'Physical',
        ai_behavior: 'Berserker',
        spawn_frequency: 'Rare'
      },
      { 
        name: 'Dark Lich', 
        type: 'Undead', 
        level: 60, 
        hp: 800, 
        attack_power: 120, 
        defense: 60, 
        experience_reward: 1200, 
        drop_chance: 25.0,
        is_elite: true,
        weakness: 'Holy',
        resistance: 'Dark',
        ai_behavior: 'Spellcaster',
        spawn_frequency: 'Very Rare'
      }
    ];
    
    // Mob verilerini ekle
    for (const mob of sampleMobs) {
      try {
        await pool.query(`
          INSERT INTO mobs (
            name, type, level, hp, attack_power, defense, experience_reward,
            drop_chance, is_elite, weakness, resistance, ai_behavior, spawn_frequency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (name) DO UPDATE SET
            type = EXCLUDED.type,
            level = EXCLUDED.level,
            hp = EXCLUDED.hp,
            attack_power = EXCLUDED.attack_power,
            defense = EXCLUDED.defense,
            experience_reward = EXCLUDED.experience_reward,
            drop_chance = EXCLUDED.drop_chance,
            is_elite = EXCLUDED.is_elite,
            weakness = EXCLUDED.weakness,
            resistance = EXCLUDED.resistance,
            ai_behavior = EXCLUDED.ai_behavior,
            spawn_frequency = EXCLUDED.spawn_frequency
        `, [
          mob.name, mob.type, mob.level, mob.hp, mob.attack_power, mob.defense,
          mob.experience_reward, mob.drop_chance, mob.is_elite, mob.weakness,
          mob.resistance, mob.ai_behavior, mob.spawn_frequency
        ]);
        console.log(`${mob.name} yaratığı eklendi/güncellendi!`);
      } catch (err) {
        console.error(`${mob.name} yaratığı eklenirken hata:`, err.message);
      }
    }
    
    console.log('Tüm örnek veriler eklendi!');
    
    // Verileri kontrol et
    const locationCount = await pool.query('SELECT COUNT(*) FROM locations');
    const mobCount = await pool.query('SELECT COUNT(*) FROM mobs');
    console.log(`Toplam konum: ${locationCount.rows[0].count}`);
    console.log(`Toplam yaratık: ${mobCount.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('Hata oluştu:', error);
    await pool.end();
  }
}

addSampleData();