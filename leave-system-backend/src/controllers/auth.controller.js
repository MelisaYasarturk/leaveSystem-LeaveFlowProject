// şifreleri hashlemek için bcrypt kütüphanesini dahil ediyoruz
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  // token üretimi için
const crypto = require('crypto');     // Reset token için

// Prisma Client nesnesini oluşturuyoruz (veritabanına erişmek için)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const calculateUsedLeaveDays = require('../helpers/calculateUsedLeaveDays');
const emailService = require('../services/emailService'); // e-posta servisimiz

// Kullanıcının kendi onaylı izinlerini ve özetini döndürür
const getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.id;

    const approvedLeaves = await prisma.leave.findMany({
      where: { userId, status: 'APPROVED' },
    });

    const usedDays = calculateUsedLeaveDays(approvedLeaves);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const remainingDays = user.annualLeaveDays - usedDays;

    res.json({
      leaves: approvedLeaves,
      usedDays,
      remainingDays,
      totalLeaveDays: user.annualLeaveDays
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// register fonksiyonu
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // email'i normalize edelim
    const normalizedEmail = String(email).trim().toLowerCase();

    const startDate = new Date();
    const currentYear = new Date().getFullYear();
    const startYear = startDate.getFullYear();
    const workingYears = currentYear - startYear;

    const annualLeaveDays = workingYears >= 5 ? 28 : 14;

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'employee',
        startDate,
        annualLeaveDays,
      },
    });

    // Hoş geldin e-postası gönder (mail başarısız olsa bile kaydı engellemeyelim)
    try {
      await emailService.sendWelcomeEmail(normalizedEmail, name);
    } catch (emailError) {
      console.error('Hoş geldin e-postası gönderilemedi:', emailError);
    }

    res.status(201).json({ message: 'Kayıt başarılı.', user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

// login fonksiyonu
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Geçersiz e-posta veya şifre.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Giriş başarılı.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

// forgot password fonksiyonu
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Güvenlik açısından 404 döndürmek yerine "gönderildi" demek de tercih edilebilir
      return res.status(404).json({ message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
    }

    // Reset token oluştur (32 bayt hex) ve 1 saat geçerlilik süresi
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    // Eski tokenları temizle (aynı kullanıcı için)
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    // Yeni token kaydet
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt
      }
    });

    try {
      // E-posta gönderimi (emailService içinde FRONTEND_URL kullanılarak link oluşuyor)
      await emailService.sendPasswordResetEmail(normalizedEmail, resetToken, user.name);

      return res.json({
        message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
      });
    } catch (emailError) {
      console.error('E-posta gönderimi başarısız:', emailError);

      // Development ortamında geliştiriciye yardımcı olmak için token'ı dönebiliriz
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          message: 'Geliştirme: E-posta gönderilemedi, ancak token üretildi.',
          resetToken
        });
      }

      // Production’da mail hatasında 500 dönmek daha doğru
      return res.status(500).json({
        message: 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.'
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

// reset password fonksiyonu
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Basit şifre doğrulaması
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    // Token'ı bul ve kontrol et
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }

    if (new Date() > resetToken.expiresAt) {
      // Süresi dolmuş token'ı sil
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      });
      return res.status(400).json({ message: 'Token süresi dolmuş.' });
    }

    // Yeni şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Kullanıcının şifresini güncelle
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    });

    // Bu kullanıcı için tüm reset tokenlarını temizle (tek tek yerine topluca)
    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId }
    });

    res.json({ message: 'Şifreniz başarıyla güncellendi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

// dışarı aktarıyoruz
module.exports = { register, login, forgotPassword, resetPassword, getMyLeaves };
