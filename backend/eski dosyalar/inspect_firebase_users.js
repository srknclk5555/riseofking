const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectFirebaseUsers() {
  try {
    console.log('Inspecting Firebase user structure...');
    
    const usersSnapshot = await db.collection('artifacts').doc('rise_online_tracker_app').collection('users').get();
    
    console.log(`Total users: ${usersSnapshot.size}\n`);
    
    let index = 1;
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      console.log(`User ${index}: ${doc.id}`);
      console.log('Data structure:');
      console.log(JSON.stringify(data, null, 2));
      console.log('---\n');
      index++;
      
      // Only show first 3 users to avoid too much output
      if (index > 3) break;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

inspectFirebaseUsers();