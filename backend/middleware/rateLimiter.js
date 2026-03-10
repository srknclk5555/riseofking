const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 250, // IP başına 15 dakikada max 250 istek (Optimize edildiği için limit düşürüldü)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.' }
});

const strictWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Yazma işlemleri için daha sıkı (Optimize edildiği için limit düşürüldü)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla yazma isteği. 15 dakika sonra tekrar deneyin.' }
});

module.exports = { generalLimiter, strictWriteLimiter };
