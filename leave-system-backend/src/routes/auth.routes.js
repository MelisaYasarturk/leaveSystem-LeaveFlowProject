// express kütüphanesini dahil ediyoruz
const express = require ('express');

//router nesnesş oluşturuyoruzi bu nesneye route'larımızı tanımlayacağız
const router = express.Router();

//register fons-ksiyonunu controller'dan alıyoruz
const { register, login, forgotPassword, resetPassword } = require('../controllers/auth.controller');

//POST isteği: /api/auth/register adresine gelen talepleri register fonksiyonuna yönlendiriyoruz
router.post('/register', register);
router.post('/login', login); //  login endpoint
router.post('/forgot-password', forgotPassword); // forgot password endpoint
router.post('/reset-password', resetPassword); // reset password endpoint

//Bu router'ı dışa aktarıyoruz ki app.js içinde kullanılsın
module.exports = router;