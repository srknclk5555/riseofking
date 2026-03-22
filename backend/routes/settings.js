const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/settings/ads - Tüm oyuncular (Public) okuyabilir
router.get('/ads', settingsController.getAdSettings);

// PUT /api/settings/ads - SIFIR TOLERANS: Yetkili admin (astral1) değiştirebilir
router.put('/ads', authMiddleware, requireAdmin, settingsController.updateAdSettings);

module.exports = router;
