//şifreleri hashlemek için bcrypt kütüphanesini dahil ediyoruz
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');  //token üretimi için
const crypto = require('crypto'); // Reset token için

//Prisma Client nesnesini oluşturuyoruz (veritabanına erişmek için)
const { PrismaClient } = require ( '@prisma/client' );
const prisma = new PrismaClient();

const calculateUsedLeaveDays = require('../helpers/calculateUsedLeaveDays');
const emailService = require('../services/emailService');

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

//register adında kullanıcıyı kaydedecek bir fonkisyon yazıyoruz
const register = async (req, res) =>{
    try {
        //request'ten gelen verileri alıyoruz
        const {name, email, password} = req.body;
        const startDate = new Date(); // Şu anki tarih işe başlama tarihi
        const currentYear = new Date().getFullYear();
        const startYear = startDate.getFullYear();
        const workingYears = currentYear - startYear;

        const annualLeaveDays = workingYears >= 5 ? 28 : 14;


        //aynı emaille daha önce kaydolmuş kullanıcı var mı kontrol ediyoruz
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

    //Kullanıcı varsa hata dönüyoruz    
    if (existingUser) {
        return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.'});
    }

    //şifreyi hashliyoruz (10 saltround)
    const hashedPassword = await bcrypt.hash(password, 10);

    //yeni kullanıcıyı veritabanına kayddiyoruz (rolü otomatik employee)
    const newUser = await prisma.user.create({
        data: {
            name, 
            email,
            password : hashedPassword,
            role : 'employee', //ilk girişte tüm kullanıcılar employee olarak başlar
            startDate,         // işe başlama tarihi
            annualLeaveDays,   // yıllık izin hakkı
        },
    });

    // Hoş geldin e-postası gönder
    try {
        await emailService.sendWelcomeEmail(email, name);
    } catch (emailError) {
        console.error('Hoş geldin e-postası gönderilemedi:', emailError);
    }

    //başarılı kayıt yanıtı
    res.status(201).json({ message: 'Kayıt başarılı.', user: newUser});
    } catch (err) {
        //hata olursa loglayıp genel sunucu hatası döneriz
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası. '});
    }

};

//login fonksiyonu
const login = async (req, res) =>{
    try{
        const { email , password } = req.body;

        //1. kullanıcıyı veritabanında ara
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user){
            return res.status(401).json({message: 'Geçersiz e-posta veya şifre.'});
        }

        //2. şifreyi karşılaştır
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(401).json({message: 'Geçersiz e-posta veya şifre.'});
        }

        //3. jwt token oluşturma
        const token = jwt.sign(
            {id: user.id, role: user.role},   // 1. Payload (kime ait?)
            process.env.JWT_SECRET,           // 2. Gizli anahtar
            {expiresIn: '1d'}                   // 3. Geçerlilik süresi
        );

        res.json({
            message: 'Giriş başarılı.',
            token,
            user:{
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department?.name || null, 
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Sunucu hatası.'});
    }

}

// Forgot password fonksiyonu
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Kullanıcıyı bul
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
        }

        // Reset token oluştur
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 saat geçerli

        // Eski reset token'ları temizle
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id }
        });

        // Yeni reset token kaydet
        await prisma.passwordResetToken.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt
            }
        });

        // E-posta gönder
        try {
            await emailService.sendPasswordResetEmail(email, resetToken, user.name);
            res.json({ 
                message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
            });
        } catch (emailError) {
            console.error('E-posta gönderimi başarısız:', emailError);
            // E-posta gönderimi başarısız olsa bile token'ı döndür (geliştirme için)
            res.json({ 
                message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
                resetToken: resetToken // Geliştirme için, production'da kaldırılacak
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// Reset password fonksiyonu
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

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

        // Reset token'ı sil
        await prisma.passwordResetToken.delete({
            where: { id: resetToken.id }
        });

        res.json({ message: 'Şifreniz başarıyla güncellendi.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};



// dışarı aktarıyoruz ki routes'da da kullanılabilsin
module.exports = { register, login, forgotPassword, resetPassword };