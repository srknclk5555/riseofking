const express = require('express');
const router = express.Router();
const {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationCount
} = require('../controllers/locationController');

const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// Location endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/count', getLocationCount);
router.get('/', getAllLocations);
router.get('/:id', getLocationById);
router.post('/', authMiddleware, requireAdmin, createLocation);
router.put('/:id', authMiddleware, requireAdmin, updateLocation);
router.delete('/:id', authMiddleware, requireAdmin, deleteLocation);

module.exports = router;