const express = require('express');
const router = express.Router();
const { writeLimiter, apiLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');
const {
  getAllFarms,
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm,
  getFarmCount,
  getUserFarms
} = require('../controllers/farmController');

// Rate Limiter middleware'leri middleware/rateLimiter.js'den geliyor

// Tüm route'lar için yetkilendirme gerekli
router.use(authMiddleware);

// Farm endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/count', apiLimiter, getFarmCount);
router.get('/user/:userId', apiLimiter, getUserFarms);
router.get('/', apiLimiter, getAllFarms);
router.get('/:id', apiLimiter, getFarmById);
router.post('/', writeLimiter, createFarm);
router.put('/:id', writeLimiter, updateFarm);
router.delete('/:id', writeLimiter, deleteFarm);

module.exports = router;