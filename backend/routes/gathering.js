const express = require('express');
const GatheringController = require('../controllers/gatheringController');
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

// Tüm toplama loglarını getir
router.get('/user/:userId', GatheringController.getAllLogs);

// Belirli tarih için toplama loglarını getir
router.get('/user/:userId/date/:date', GatheringController.getLogsByDate);

// Yeni toplama logu oluştur
router.post('/user/:userId', writeLimiter, GatheringController.createLog);

// Toplama logunu güncelle
router.put('/:id', writeLimiter, GatheringController.updateLog);

// Toplama logunu sil
router.delete('/:id', writeLimiter, GatheringController.deleteLog);

// Belirli profesyon için süre getir
router.get('/user/:userId/date/:date/profession/:profession/duration', GatheringController.getDuration);

// Profesyon süresini güncelle
router.put('/user/:userId/date/:date/profession/:profession/duration', writeLimiter, GatheringController.updateDuration);

// Raporlar
router.get('/user/:userId/report/summary', GatheringController.getReportSummary);
router.get('/user/:userId/report/timeseries/profit', GatheringController.getProfitTimeSeries);
router.get('/user/:userId/report/breakdown/daily', GatheringController.getDailyBreakdown);

module.exports = router;