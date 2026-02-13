const crypto = require('crypto');
require('dotenv').config();

// Şifreleme algoritması
const ALGORITHM = 'aes-256-cbc';
// Anahtar (.env dosyasından alınır)
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY;
const IV_LENGTH = 16; // AES block size

class EncryptionService {

    static encrypt(text) {
        if (!text) return text;
        if (!ENCRYPTION_KEY) {
            console.error('Encryption key is missing!');
            return text;
        }

        // Rastgele bir IV (Initialization Vector) oluştur
        const iv = crypto.randomBytes(IV_LENGTH);

        // Anahtarı Buffer'a çevir (Hex string beklenir)
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');

        // Cipher oluştur
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Metni şifrele
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // IV:EncryptedText formatında döndür (Hex string)
        // IV'yi saklamak zorundayız, çünkü çözmek için lazım
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    static decrypt(text) {
        if (!text) return text;
        // Eğer format IV:EncryptedText değilse (eski mesajlar şifresiz olabilir), olduğu gibi döndür
        const parts = text.split(':');
        if (parts.length !== 2) return text;

        if (!ENCRYPTION_KEY) {
            console.error('Encryption key is missing!');
            return text;
        }

        try {
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = Buffer.from(parts[1], 'hex');
            const key = Buffer.from(ENCRYPTION_KEY, 'hex');

            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString();
        } catch (error) {
            console.error('Decryption failed:', error);
            // Çözülemezse (şifre yanlışsa veya veri bozuksa) orijinal metni veya hata mesajını döndür
            return '[Şifreli Mesaj - Çözülemedi]';
        }
    }
}

module.exports = EncryptionService;
