const express = require('express');
const MessageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate Limiter: Mesaj gönderme için (spam koruması)
const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 20, // IP başına 20 mesaj
    message: { error: 'Too many messages, please try again later.' }
});

// Tüm route'lar Auth korumalı
router.use(authMiddleware);

// Mesajları getir
router.get('/user/:userId', MessageController.getAllMessages);
router.get('/conversation/:userId/:contactId', MessageController.getConversation);

// Mesaj gönder (Rate Limit ekli)
router.post('/user/:userId', messageLimiter, MessageController.createMessage);

// Okundu işaretle
router.put('/:id/read', MessageController.markAsRead);

// Sil
router.delete('/:id', MessageController.deleteMessage);

// Okunmamış sayısı
router.get('/unread-count/:userId', MessageController.getUnreadCount);

// Engelleme işlemleri
router.post('/block/:userId', MessageController.blockUser);
router.delete('/unblock/:userId/:blockId', MessageController.unblockUser);
router.get('/blocked/:userId', MessageController.getBlockedUsers);

module.exports = router;