const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findFirestoreUsers() {
  try {
    console.log('Searching for users in Firestore...');
    
    // Try different possible paths
    const paths = [
      'users',
      'artifacts/rise_online_tracker_app/users',
      'rise_online_tracker_app/users'
    ];
    
    for (const path of paths) {
      try {
        console.log(`\nChecking path: ${path}`);
        const snapshot = await db.collection(path).get();
        console.log(`Found ${snapshot.size} users in ${path}`);
        
        if (snapshot.size > 0) {
          snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- ${doc.id}: ${data.username || data.profile?.mainCharacter || 'No name'}`);
          });
        }
      } catch (error) {
        console.log(`Path ${path} not found or inaccessible`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

findFirestoreUsers();