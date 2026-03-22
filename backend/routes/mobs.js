const express = require('express');
const router = express.Router();
const {
  getAllMobs,
  getMobById,
  createMob,
  updateMob,
  deleteMob,
  getMobCount
} = require('../controllers/mobController');

const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// Mob endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/count', getMobCount);
router.get('/', getAllMobs);
router.get('/:id', getMobById);
router.post('/', authMiddleware, requireAdmin, createMob);
router.put('/:id', authMiddleware, requireAdmin, updateMob);
router.delete('/:id', authMiddleware, requireAdmin, deleteMob);

module.exports = router;