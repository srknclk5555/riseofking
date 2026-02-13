const { Pool } = require('pg');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Firebase Admin Initialization
const svcPath = path.join(__dirname, 'craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');
if (!fs.existsSync(svcPath)) {
    console.error('❌ Firebase Service Account JSON bulunamadı:', svcPath);
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(fs.readFileSync(svcPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✓ Firebase Admin initialized.');
} catch (e) {
    console.error('❌ Firebase Admin init failed:', e.message);
    process.exit(1);
}

// 2. PostgreSQL Connection Pool
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: String(process.env.PG_PASSWORD),
    database: process.env.PG_DATABASE || 'rise_online_tracker',
});

async function syncUsers() {
    try {
        const dbFs = admin.firestore();
        console.log('--- FIRESTORE -> POSTGRESQL SENKRONİZASYONU BAŞLADI ---');

        // 0. Email kolonunu nullable yap (Kısıtlamadan kurtulmak için)
        console.log('0. "email" kolonu nullable yapılıyor (Kısıtlama temizliği)...');
        try {
            await pool.query('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');
        } catch (e) {
            console.log('ℹ️ Email kolonu zaten nullable veya mevcut değil.');
        }

        // Firestore'dan tüm kullanıcıları çek
        const usersSnapshot = await dbFs.collection('artifacts').doc('rise_online_tracker_app').collection('users').get();
        console.log(`✓ Firestore'da ${usersSnapshot.size} kullanıcı bulundu.`);

        let successCount = 0;
        let failCount = 0;

        for (const doc of usersSnapshot.docs) {
            const uid = doc.id;
            const data = doc.data();
            const profile = data.profile || {};

            const username = profile.username || null;
            const mainCharacter = profile.mainCharacter || profile.maincharacter || null;

            try {
                // Opsiyonel: Firebase Auth'tan email çekmeyi dene
                let email = profile.email || null;
                if (!email) {
                    try {
                        const userRecord = await admin.auth().getUser(uid);
                        email = userRecord.email;
                    } catch (authErr) {
                        // Email bulunamazsa null kalabilir
                    }
                }

                // PostgreSQL'de güncelle
                const upsertQuery = `
          INSERT INTO users (uid, email, profile, username, "mainCharacter")
          VALUES ($1, $2, $3::jsonb, $4, $5)
          ON CONFLICT (uid)
          DO UPDATE SET
            email = COALESCE(users.email, EXCLUDED.email),
            username = COALESCE(EXCLUDED.username, users.username),
            "mainCharacter" = COALESCE(EXCLUDED."mainCharacter", users."mainCharacter"),
            profile = COALESCE(users.profile, '{}'::jsonb) || EXCLUDED.profile
          RETURNING uid;
        `;

                await pool.query(upsertQuery, [uid, email, JSON.stringify(profile), username, mainCharacter]);
                successCount++;
                if (successCount % 5 === 0) console.log(`... ${successCount} kullanıcı işlendi.`);
            } catch (err) {
                console.error(`✗ HATA (UID: ${uid}):`, err.message);
                failCount++;
            }
        }

        console.log('\n--- SENKRONİZASYON TAMAMLANDI ---');
        console.log(`✅ Başarılı: ${successCount}`);
        console.log(`❌ Hatalı: ${failCount}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ KRİTİK HATA:', error.message);
        process.exit(1);
    }
}

syncUsers();
