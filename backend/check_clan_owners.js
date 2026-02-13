const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkClanOwners() {
  try {
    console.log('Checking clan owners in Firestore...');
    
    const usersSnapshot = await db.collection('artifacts').doc('rise_online_tracker_app').collection('users').get();
    
    const clanOwners = [];
    const allUsers = [];
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      allUsers.push({ id: doc.id, data: data });
      
      // Check if user has a clan and is the owner
      if (data.clan && data.clan.ownerId) {
        clanOwners.push({
          id: doc.id,
          clanOwnerId: data.clan.ownerId,
          clan: data.clan
        });
      }
    }
    
    console.log('\nUsers who are clan owners:');
    if (clanOwners.length === 0) {
      console.log('No clan owners found');
    } else {
      clanOwners.forEach(user => {
        console.log(`- User ID: ${user.id}, Clan Owner ID: ${user.clanOwnerId}`);
      });
    }
    
    console.log('\nAll users:');
    allUsers.forEach(user => {
      const name = user.data.profile?.mainCharacter || user.data.username || 'No name';
      console.log(`- ${user.id}: ${name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkClanOwners();