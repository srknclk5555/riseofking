const EncryptionService = require('../services/encryptionService');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

async function testEncryption() {
    console.log('🔒 Şifreleme Testi Başlıyor...');

    const originalText = "Bu çok gizli bir mesajdır! 🚀";
    console.log(`📝 Orijinal: "${originalText}"`);

    // 1. Servis Testi
    const encrypted = EncryptionService.encrypt(originalText);
    console.log(`🔐 Şifreli: "${encrypted}"`);

    if (encrypted === originalText) {
        console.error('❌ HATA: Metin şifrelenmedi!');
        process.exit(1);
    }

    const decrypted = EncryptionService.decrypt(encrypted);
    console.log(`🔓 Çözülmüş: "${decrypted}"`);

    if (decrypted !== originalText) {
        console.error('❌ HATA: Çözülen metin orijinalle eşleşmiyor!');
        process.exit(1);
    }

    console.log('✅ Servis testi BAŞARILI.');

    // 2. Veritabanı Entegrasyon Testi
    console.log('\n🗄️ Veritabanı Entegrasyon Testi...');
    const client = await pool.connect();
    try {
        // Test verisi ekle
        const senderId = 'test_sender';
        const receiverId = 'test_receiver';

        // Temizlik (varsa sil)
        await client.query("DELETE FROM private_messages WHERE sender_id = $1", [senderId]);

        const res = await client.query(
            `INSERT INTO private_messages (sender_id, receiver_id, text, participants, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
            [senderId, receiverId, encrypted, [senderId, receiverId]]
        );

        const dbRow = res.rows[0];
        console.log('✅ Veritabanına kayıt eklendi. ID:', dbRow.id);
        console.log(`   DB'deki Text: "${dbRow.text}" (Şifreli olmalı)`);

        if (dbRow.text === originalText) {
            throw new Error('Veritabanında şifresiz veri saklanıyor!');
        }

        // Okuma testi
        const readRes = await client.query("SELECT * FROM private_messages WHERE id = $1", [dbRow.id]);
        const readRow = readRes.rows[0];
        const decryptedFromDb = EncryptionService.decrypt(readRow.text);

        console.log(`   DB'den okunup çözülen: "${decryptedFromDb}"`);

        if (decryptedFromDb !== originalText) {
            throw new Error('DB verisi doğru çözülemedi!');
        }

        console.log('✅ Veritabanı testi BAŞARILI.');

        // Temizlik
        await client.query("DELETE FROM private_messages WHERE id = $1", [dbRow.id]);
        console.log('🧹 Test verisi temizlendi.');

    } catch (e) {
        console.error('❌ DB Test Hatası:', e);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

testEncryption();
