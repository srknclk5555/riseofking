const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Kullanıcı profili getirme
router.get('/profile/:uid', authMiddleware, userController.getProfile);

// Kullanıcı profili güncelleme
router.put('/profile/:uid', authMiddleware, userController.updateProfile);

// Arkadaş ekleme
router.post('/friends/:uid', authMiddleware, userController.addFriend);

// Arkadaş silme
router.delete('/friends/:uid/:friendKey', authMiddleware, userController.deleteFriend);

// Arkadaş bağlama
router.post('/friends/:uid/link/:friendKey', authMiddleware, userController.linkFriend);

// Kullanıcı adı ile kullanıcı bulma
router.get('/find/:username', userController.findUserByUsername);

// Kullanıcı adı tanımlanmış tüm kullanıcıları getir
router.get('/users-with-usernames', userController.getUsersWithUsernames);

module.exports = router;