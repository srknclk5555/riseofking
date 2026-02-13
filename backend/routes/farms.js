const express = require('express');
const router = express.Router();
const {
  getAllFarms,
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm,
  getFarmCount,
  getUserFarms
} = require('../controllers/farmController');

// Farm endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/count', getFarmCount);
router.get('/user/:userId', getUserFarms);
router.get('/', getAllFarms);
router.get('/:id', getFarmById);
router.post('/', createFarm);
router.put('/:id', updateFarm);
router.delete('/:id', deleteFarm);

module.exports = router;