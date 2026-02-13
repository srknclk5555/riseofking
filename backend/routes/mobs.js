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

// Mob endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/count', getMobCount);
router.get('/', getAllMobs);
router.get('/:id', getMobById);
router.post('/', createMob);
router.put('/:id', updateMob);
router.delete('/:id', deleteMob);

module.exports = router;