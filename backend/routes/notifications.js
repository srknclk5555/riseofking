const express = require('express');
const router = express.Router();
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

// Notification endpoint'leri
// Sıra önemli: özel rotalar önce, sonra parametreli rotalar
router.get('/unread-count/:userId', getUnreadCount);
router.get('/user/:userId', getUserNotifications);
router.post('/mark-all-read/:userId', markAllAsRead);
router.get('/', getAllNotifications);
router.get('/:id', getNotificationById);
router.post('/', createNotification);
router.put('/:id/read', markAsRead);
router.put('/:id', updateNotification);
router.delete('/:id', deleteNotification);

module.exports = router;