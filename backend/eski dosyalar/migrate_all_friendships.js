const pool = require('./config/database');

async function migrateAllFriendships() {
  try {
    console.log('Starting full friendship migration...');

    // Tüm kullanıcıları ve arkadaş listelerini al
    const usersResult = await pool.query(`
      SELECT uid, other_players 
      FROM users 
      WHERE other_players IS NOT NULL 
        AND other_players != '{}'
        AND other_players != 'null'
    `);

    console.log(`Found ${usersResult.rows.length} users with friendships`);

    let totalInserted = 0;

    for (const user of usersResult.rows) {
      const userId = user.uid;
      const otherPlayers = user.other_players;

      if (!otherPlayers || typeof otherPlayers !== 'object') continue;

      // Her arkadaşlık ilişkisi için
      for (const [key, friendData] of Object.entries(otherPlayers)) {
        if (friendData && friendData.uid && friendData.uid !== 'null' && friendData.uid !== null) {
          try {
            // İki yönlü arkadaşlık oluştur (bidirectional)
            await pool.query(
              `INSERT INTO friendships (user_id, friend_id, status) 
               VALUES ($1, $2, $3) 
               ON CONFLICT (user_id, friend_id) DO NOTHING`,
              [userId, friendData.uid, 'accepted']
            );

            // Ters yönde de ekle
            await pool.query(
              `INSERT INTO friendships (user_id, friend_id, status) 
               VALUES ($2, $1, $3) 
               ON CONFLICT (user_id, friend_id) DO NOTHING`,
              [userId, friendData.uid, 'accepted']
            );

            totalInserted += 2; // İki yönlü eklendi
          } catch (err) {
            console.log(`Error inserting friendship: ${userId} <-> ${friendData.uid}`, err.message);
          }
        }
      }
    }

    console.log(`Migration completed. Processed ${totalInserted} friendship records`);

    // Test: bazı kullanıcılar için arkadaşlık sayısını kontrol et
    const sampleResult = await pool.query(
      `SELECT user_id, COUNT(*) as friend_count 
       FROM friendships 
       GROUP BY user_id 
       LIMIT 10`
    );
    console.log('Sample friendship counts:', sampleResult.rows);

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateAllFriendships();