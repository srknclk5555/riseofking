const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const svcPath = path.join(__dirname, 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');
const serviceAccount = JSON.parse(fs.readFileSync(svcPath, 'utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function check() {
    const db = admin.firestore();
    console.log('--- FIRESTORE DATA CHECK ---');
    const snap = await db.collection('artifacts').doc('rise_online_tracker_app').collection('users').limit(5).get();
    snap.forEach(doc => {
        console.log(`UID: ${doc.id}`);
        console.log(`Profile: ${JSON.stringify(doc.data().profile)}`);
    });
    process.exit(0);
}

check();
