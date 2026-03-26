// bot_test.js - Kaba Kuvvet Saldırı Simülasyonu
const API_URL = 'http://localhost:5000/api/auth/login';

async function startBruteForce() {
    console.log("🚀 Hacker Bot: Kaba Kuvvet (Brute-Force) saldırısı başlatılıyor...");
    
    // 10 kere üst üste hızlıca yanlış şifre deneyeceğiz
    for (let i = 1; i <= 10; i++) {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: "astral1", password: `yanlisSifre${i}` })
            });
            
            const data = await res.json();
            console.log(`[Vuruş ${i}] HTTP Kodu: ${res.status} | Sunucu Yanıtı:`, data.error || data.message);
            
            // İstekler arasına çok ufak bir bekleme koyalım (hızlı bot)
            await new Promise(resolve => setTimeout(resolve, 100)); 
        } catch (err) {
            console.error(`[Vuruş ${i}] Bağlantı Hatası:`, err.message);
        }
    }
    console.log("🛑 Saldırı simülasyonu bitti.");
}

startBruteForce();