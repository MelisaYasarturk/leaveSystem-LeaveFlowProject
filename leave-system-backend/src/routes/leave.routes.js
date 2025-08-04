const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { getMyLeaves, createLeave } = require('../controllers/leave.controller');



// 🔐 Giriş yapmış her kullanıcı kendi izin geçmişini görebilir
router.get('/mine', authenticate, getMyLeaves);

// 📝 Giriş yapmış kullanıcı yeni izin talebi oluşturabilir
router.post('/create', authenticate, createLeave);

module.exports = router;
