const jwt = require('jsonwebtoken');

//giriş kontrolü , token doğrulama
const authenticate = (req, res, next) =>{
    console.log('> Authenticate middleware çalıştı');
    const authHeader = req.headers.authorization;

    //token header'da var mı, kontrol et
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        console.log('> Token bulunamadı veya format hatalı');
        return res.status(401).json( {message: 'Yetkilendirme hatası : Token bulunamadı. ' });
    }

    const token = authHeader.split(' ')[1];

    try{
        //token'ı çöz -> user bilgisi içinde saklı
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // artık tüm route'larda req.user ile erişebilirsin
        console.log('> Token doğrulandı. Kullanıcı:', req.user);
        next();
    } catch(err){
        return res.status(401).json( {message: 'Geçersiz token' });
    }
};

//Rol bazlı kontrol, sadece belli roller erişebilir
const requireRole = roles => {
    return ( req, res, next ) =>{
        console.log('> Role kontrol middleware çalıştı. Rol:', req.user?.role);
        if(!roles.includes(req.user.role)) {
            console.log('> Rol uygun değil:', req.user.role);
            return res.status(403).json({ message: 'Yetkisiz erişim: rolünüz uygun değil.'});
        }
        next();
};
};

module.exports = { authenticate, requireRole };