const pool = require('./config/database');

async function migrateFriendships() {
  try {
    console.log('Starting friendship migration...');
    
    // Tüm kullanıcıları ve arkadaşlarını al
    const result = await pool.query('SELECT uid, other_players FROM users WHERE other_players IS NOT NULL AND other_players != \'{}\'');
    
    console.log('Found', result.rows.length, 'users with friendships');
    
    let insertedCount = 0;
    
    for (const user of result.rows) {
      const userId = user.uid;
      const friends = user.other_players;
      
      if (!friends || typeof friends !== 'object') continue;
      
      // Her arkadaş için friendships tablosuna ekle
      for (const [key, friendData] of Object.entries(friends)) {
        if (friendData && friendData.uid && friendData.uid !== 'null' && friendData.uid !== null) {
          try {
            await pool.query(
              'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3) ON CONFLICT (user_id, friend_id) DO NOTHING',
              [userId, friendData.uid, 'accepted']
            );
            insertedCount++;
            console.log('Added friendship:', userId, '->', friendData.uid);
          } catch (err) {
            console.log('Skipping duplicate friendship:', userId, '->', friendData.uid);
          }
        }
      }
    }
    
    console.log('Migration completed. Inserted', insertedCount, 'friendship records');
    
    // Test: Arkadaşlık sayısını kontrol et
    const countResult = await pool.query('SELECT COUNT(*) FROM friendships');
    console.log('Total friendships in database:', countResult.rows[0].count);
    
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateFriendships();