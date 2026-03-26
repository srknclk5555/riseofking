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

// Farm endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/count', authMiddleware, apiLimiter, getFarmCount);
router.get('/user/:userId', authMiddleware, apiLimiter, getUserFarms);
router.get('/', authMiddleware, apiLimiter, getAllFarms);
router.get('/:id', authMiddleware, apiLimiter, getFarmById);
router.post('/', authMiddleware, writeLimiter, createFarm);
router.put('/:id', authMiddleware, writeLimiter, updateFarm);
router.delete('/:id', authMiddleware, writeLimiter, deleteFarm);

module.exports = router;