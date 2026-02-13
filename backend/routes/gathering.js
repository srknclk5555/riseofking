const express = require('express');
const GatheringController = require('../controllers/gatheringController');

const router = express.Router();

// Tüm toplama loglarını getir
router.get('/user/:userId', GatheringController.getAllLogs);

// Belirli tarih için toplama loglarını getir
router.get('/user/:userId/date/:date', GatheringController.getLogsByDate);

// Yeni toplama logu oluştur
router.post('/user/:userId', GatheringController.createLog);

// Toplama logunu güncelle
router.put('/:id', GatheringController.updateLog);

// Toplama logunu sil
router.delete('/:id', GatheringController.deleteLog);

// Belirli profesyon için süre getir
router.get('/user/:userId/date/:date/profession/:profession/duration', GatheringController.getDuration);

// Profesyon süresini güncelle
router.put('/user/:userId/date/:date/profession/:profession/duration', GatheringController.updateDuration);

module.exports = router;