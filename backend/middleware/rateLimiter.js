const rateLimit = require('express-rate-limit');

// GLOBAL RATE LIMITER - SADECE IP BAZLI (auth'dan önce çalışır)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına 15 dakikada max 100 istek
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // SADECE IP! req.user undefined burada
  message: { 
    error: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.',
    retryAfter: 900
  },
  skip: (req) => {
    // Static dosyalar rate limit'e takılmasın
    return req.path.startsWith('/static') || 
           req.path.startsWith('/assets') ||
           req.path === '/favicon.ico';
  }
});

// WRITE İŞLEMLERİ - USER BAZLI (auth'dan sonra çalışır)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30, // Kullanıcı başına dakikada 30 istek
  keyGenerator: (req) => req.user?.uid || req.ip, // User bazlı, yoksa IP
  message: { 
    error: 'Çok fazla yazma işlemi. Bir dakika bekleyin.',
    retryAfter: 60
  }
});

// LOGIN/REGISTER - BRUTEFORCE KORUMASI
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 15 dakikada 5 başarısız deneme
  skipSuccessfulRequests: true, // Sadece başarısız girişleri say
  keyGenerator: (req) => req.ip, // IP bazlı (user henüz belli değil)
  message: { 
    error: 'Çok fazla başarısız giriş. 15 dakika bekleyin.',
    retryAfter: 900
  }
});

// API RATE LIMITER - Orta seviye koruma
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 60, // Dakikada 60 istek
  keyGenerator: (req) => req.user?.uid || req.ip,
  message: { 
    error: 'API rate limit aşıldı. Bir dakika bekleyin.',
    retryAfter: 60
  }
});

module.exports = {
  generalLimiter,
  writeLimiter,
  loginLimiter,
  apiLimiter
};
