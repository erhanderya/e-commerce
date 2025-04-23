const express = require('express');
const { register, login, getProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', verifyToken, getProfile);

module.exports = router; 