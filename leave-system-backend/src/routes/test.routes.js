const express = require( 'express');
const router = express.Router();

const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// giriş yapmış her kullanıcı erişebilir
router.get('/me', authenticate, (req, res) => {
    res.json({
        message: 'Yetkili kullanıcı' ,
        user: req.user
    });
});

// Sadece MANAGER rolüne sahip kullanıcı erişebilir
router.get('/manager', authenticate, requireRole(['manager']), (req, res) => {
  res.json({ message: 'Yönetici paneline hoş geldin!' });
});

//Sadece HR rolüne sahip kullanıcılar erişebilir
router.get('/hr', authenticate, requireRole(['hr']), (req, res) => {
    res.json({ message: 'HR paneline hoşgeldin!'});
});

//hem hr hem manager
router.get('/shared', authenticate, requireRole(['manager', 'hr']), (req, res) => {
  res.json({ message: 'Yönetici ve/veya HR erişti.' });
});

module.exports = router;