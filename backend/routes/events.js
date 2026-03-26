const express = require('express');
const EventController = require('../controllers/eventController');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rate Limiter: Yazma işlemleri için dakikada max 30 istek
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tüm route'lar için yetkilendirme gerekli
router.use(authMiddleware);

// Tüm etkinlik loglarını getir
router.get('/user/:userId', EventController.getAllLogs);

// Belirli tarih için etkinlik loglarını getir
router.get('/user/:userId/date/:date', EventController.getLogsByDate);

// Yeni etkinlik logu oluştur
router.post('/user/:userId', writeLimiter, EventController.createLog);

// Etkinlik logunu güncelle
router.put('/:id', writeLimiter, EventController.updateLog);

// Etkinlik logunu sil
router.delete('/:id', writeLimiter, EventController.deleteLog);

// Belirli etkinlik için süre getir
router.get('/user/:userId/date/:date/event/:eventType/duration', EventController.getDuration);

// Etkinlik süresini güncelle
router.put('/user/:userId/date/:date/event/:eventType/duration', writeLimiter, EventController.updateDuration);

// Günlük planlı etkinlik takvimi (Crystal, Inferno, Death Match, Mount Race)
router.get('/user/:userId/schedule/:date', EventController.getDailySchedule);

// Planlı etkinlik sonucu (kazandım / kaybettim) güncelle
router.post('/user/:userId/result', writeLimiter, EventController.upsertResult);

// Belirli tarih aralığı için etkinlik istatistikleri
router.get('/user/:userId/stats', EventController.getStats);

// Rapor özeti (sonuç + süre + verimlilik)
router.get('/user/:userId/report/summary', EventController.getReportSummary);

// Kazanç zaman serisi (tahminleme için)
router.get('/user/:userId/report/timeseries/profit', EventController.getProfitTimeSeries);

// Günlük breakdown (detaylı raporlar için)
router.get('/user/:userId/report/breakdown/daily', EventController.getDailyBreakdown);

module.exports = router;