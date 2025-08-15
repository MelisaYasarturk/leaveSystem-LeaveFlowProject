const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// JWT secret key - production'da environment variable'dan alınmalı
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-here-change-this-in-production";

// Kullanıcı giriş kontrolü, token doğrulama
const authenticate = (req, res, next) => {
    console.log('> Authenticate middleware çalıştı');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('> Token bulunamadı veya format hatalı');
        return res.status(401).json({ message: 'Yetkilendirme hatası: Token bulunamadı.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Artık tüm route'larda req.user ile erişebilirsin
        console.log('> Token doğrulandı. Kullanıcı:', req.user);
        next();
    } catch (err) {
        console.log('> Token doğrulama hatası:', err.message);
        return res.status(401).json({ message: 'Geçersiz token' });
    }
};

// Rol bazlı kontrol (tek veya birden fazla rol)
const requireRole = (roles) => {
    return (req, res, next) => {
        console.log('> Role kontrol middleware çalıştı. Rol:', req.user?.role);
        if (!roles.includes(req.user.role)) {
            console.log('> Rol uygun değil:', req.user.role);
            return res.status(403).json({ message: 'Yetkisiz erişim: rolünüz uygun değil.' });
        }
        next();
    };
};

// HR veya HR Manager kontrolü
const requireHRorHRManager = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { department: true },
        });

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        const isHR = user.role === 'hr';
        const isHRManager =
            user.role === 'manager' &&
            user.department &&
            ['hr', 'human resources'].includes(user.department.name.toLowerCase());

        if (!isHR && !isHRManager) {
            return res.status(403).json({ message: 'Yetkisiz erişim: HR veya HR Manager değilsiniz.' });
        }

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

module.exports = { authenticate, requireRole, requireHRorHRManager };

