const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const {
  getAllNotifications,
  getNotificationById,
  getUserNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  markAsRead,
  getUnreadCount,
  markAllAsRead
} = require('../controllers/notificationController');

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

// Notification endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/unread-count/:userId', getUnreadCount);
router.get('/user/:userId', getUserNotifications);
router.post('/mark-all-read/:userId', writeLimiter, markAllAsRead);
router.get('/', getAllNotifications);
router.get('/:id', getNotificationById);
router.post('/', writeLimiter, createNotification);
router.put('/:id/read', writeLimiter, markAsRead);
router.put('/:id', writeLimiter, updateNotification);
router.delete('/:id', writeLimiter, deleteNotification);

module.exports = router;