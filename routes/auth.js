const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// rota protegida para testar token
router.get('/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
