const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getProfile, updateProfile } = require('../controllers/authController');

// Login ve Register için Bruteforce Koruması
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 15 dakikada max 5 başarısız giriş denemesi
  skipSuccessfulRequests: true, // Sadece başarısız girişleri say
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika bekleyin.' }
});

// Register new user
router.post('/register', loginLimiter, register);

// Login user
router.post('/login', loginLimiter, login);

// Get user profile (protected route)
router.get('/profile', getProfile);

// Update user profile (protected route)
router.put('/profile', updateProfile);

module.exports = router;