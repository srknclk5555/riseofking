const express = require('express');
const EventController = require('../controllers/eventController');

const router = express.Router();

// Tüm etkinlik loglarını getir
router.get('/user/:userId', EventController.getAllLogs);

// Belirli tarih için etkinlik loglarını getir
router.get('/user/:userId/date/:date', EventController.getLogsByDate);

// Yeni etkinlik logu oluştur
router.post('/user/:userId', EventController.createLog);

// Etkinlik logunu güncelle
router.put('/:id', EventController.updateLog);

// Etkinlik logunu sil
router.delete('/:id', EventController.deleteLog);

// Belirli etkinlik için süre getir
router.get('/user/:userId/date/:date/event/:eventType/duration', EventController.getDuration);

// Etkinlik süresini güncelle
router.put('/user/:userId/date/:date/event/:eventType/duration', EventController.updateDuration);

module.exports = router;