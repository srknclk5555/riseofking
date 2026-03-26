const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { getUserDiscordSettings, updateUserDiscordSettings, sendClanBossRunNotification } = require('../controllers/discordController');

// Rate Limiter: Yazma işlemleri için dakikada max 30 istek
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tüm route'lar için yetkilendirme gerekli
router.use(authMiddleware);

// Kullanıcı Discord ayarlarını al
router.get('/settings/:userId', getUserDiscordSettings);

// Kullanıcı Discord ayarlarını güncelle (POST)
router.post('/settings', writeLimiter, updateUserDiscordSettings);

// Kullanıcı Discord ayarlarını güncelle (PUT - userId URL'de)
router.put('/settings/:userId', writeLimiter, updateUserDiscordSettings);

// Clan boss run bildirimi gönder
router.post('/clan-boss-run', writeLimiter, sendClanBossRunNotification);

module.exports = router;