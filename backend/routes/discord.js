const express = require('express');
const router = express.Router();
const { getUserDiscordSettings, updateUserDiscordSettings, sendClanBossRunNotification } = require('../controllers/discordController');

// Middleware to get database client (BAŞINDA)
router.use(async (req, res, next) => {
  try {
    req.dbClient = await req.dbPool.connect();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Kullanıcı Discord ayarlarını al
router.get('/settings/:userId', getUserDiscordSettings);

// Kullanıcı Discord ayarlarını güncelle (POST)
router.post('/settings', updateUserDiscordSettings);

// Kullanıcı Discord ayarlarını güncelle (PUT - userId URL'de)
router.put('/settings/:userId', updateUserDiscordSettings);

// Clan boss run bildirimi gönder
router.post('/clan-boss-run', sendClanBossRunNotification);

// Release database client after each request (SONUNDA)
router.use((req, res, next) => {
  if (req.dbClient) {
    req.dbClient.release();
  }
  next();
});

module.exports = router;module.exports = router;