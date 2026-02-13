const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile } = require('../controllers/authController');

// Register new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get user profile (protected route)
router.get('/profile', getProfile);

// Update user profile (protected route)
router.put('/profile', updateProfile);

module.exports = router;