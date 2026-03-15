const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5000, // IP başına 15 dakikada max 5000 istek (Load test için artırıldı)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.' }
});

const strictWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Yazma işlemleri için (Load test için artırıldı)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla yazma isteği. 15 dakika sonra tekrar deneyin.' }
});

module.exports = { generalLimiter, strictWriteLimiter };
