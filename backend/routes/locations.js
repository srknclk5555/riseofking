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

// Location endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/count', getLocationCount);
router.get('/', getAllLocations);
router.get('/:id', getLocationById);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

module.exports = router;