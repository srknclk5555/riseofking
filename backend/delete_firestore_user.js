const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteUser(userId) {
  try {
    console.log(`Deleting user: ${userId}`);
    
    // Delete the user document
    await db.collection('artifacts').doc('rise_online_tracker_app').collection('users').doc(userId).delete();
    
    console.log(`Successfully deleted user: ${userId}`);
    process.exit(0);
  } catch (error) {
    console.error('Error deleting user:', error.message);
    process.exit(1);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
if (!userId) {
  console.log('Usage: node delete_firestore_user.js <user_id>');
  console.log('Example: node delete_firestore_user.js 5DMENCsdKbQ5DTvv9O7hqrmYwv22');
  process.exit(1);
}

deleteUser(userId);