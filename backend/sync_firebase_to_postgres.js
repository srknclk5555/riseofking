const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncFirebaseToPostgres() {
  try {
    console.log('Starting Firebase to PostgreSQL sync...');
    
    // Get all users from Firebase
    const usersSnapshot = await db.collection('artifacts').doc('rise_online_tracker_app').collection('users').get();
    console.log(`Found ${usersSnapshot.size} users in Firebase`);
    
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const firebaseUser = doc.data();
      const userId = doc.id;
      
      try {
        // Extract user data from profile
        const profile = firebaseUser.profile || {};
        const username = profile.username || null;
        const mainCharacter = profile.mainCharacter || null;
        const email = firebaseUser.email || null;
        
        // Only sync users with username
        if (!username || username.trim() === '') {
          console.log(`Skipping user ${userId} - no username`);
          skippedCount++;
          continue;
        }
        
        // Insert or update user in PostgreSQL
        const result = await pool.query(
          `INSERT INTO users (uid, username, "mainCharacter", email, "createdAt")
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (uid) 
           DO UPDATE SET 
             username = EXCLUDED.username,
             "mainCharacter" = EXCLUDED."mainCharacter",
             email = EXCLUDED.email
           RETURNING *`,
          [userId, username, mainCharacter, email]
        );
        
        console.log(`Synced user: ${userId} (${username})`);
        syncedCount++;
        
      } catch (error) {
        console.error(`Error syncing user ${userId}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\nSync completed:`);
    console.log(`- Successfully synced: ${syncedCount} users`);
    console.log(`- Skipped: ${skippedCount} users`);
    
    // Verify results
    const postgresCount = await pool.query('SELECT COUNT(*) FROM users WHERE username IS NOT NULL AND TRIM(username) != \'\'');
    console.log(`Total users in PostgreSQL with username: ${postgresCount.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Sync error:', error.message);
    process.exit(1);
  }
}

syncFirebaseToPostgres();