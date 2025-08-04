const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//İzin talebi oluşturma
const createLeave = async (req, res) => {
    try {
        const userId = req.user.id;
        const {startDate, endDate, reason} = req.body;

        // Başlangıç ve bitiş tarihini kontrol et
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ meesage: 'Tüm alanlar zorunludur.'});
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if ( end < start ) {
            return res.status(400).json({ message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.'});
        }

        //Talep kaydını oluştur
        const newLeave = await prisma.leave.create({
            data: {
                startDate: start,
                endDate: end,
                reason,
                userId,
                status: 'PENDING', // otomatik olarak pending başlar
            },
        });

        res.status(201).json({message: 'İzin talebi oluşturuldu.', leave: newLeave});
    }catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

// Kullanıcının geçmiş izinleri ve kalan gün hesabı
const calculateUsedLeaveDays = (leaves) => {
  let total = 0;
  for (const leave of leaves) {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    total += days;
  }
  return total;
};

const getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1- Veritabanından kullanıcının izinlerini çek (tüm statüler)
    const allLeavesRaw = await prisma.leave.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' }
    });

    // 2- İzinleri frontend’in istediği formatta map et (düzenle)
    const leaves = allLeavesRaw.map(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: leave.id,
        startDate: start.toISOString().split('T')[0],      // YYYY-MM-DD formatı
        endDate: end.toISOString().split('T')[0],
        duration,
        reason: leave.reason,
        status: leave.status.charAt(0) + leave.status.slice(1).toLowerCase(), // 'APPROVED' -> 'Approved'
        appliedDate: leave.createdAt ? leave.createdAt.toISOString().split('T')[0] : '', // izin talep tarihi
      };
    });

    // 3- Sadece onaylanmış izinleri filtrele ve kullanılan gün sayısını hesapla
    const approvedLeaves = allLeavesRaw.filter(l => l.status === 'APPROVED');
    const usedDays = calculateUsedLeaveDays(approvedLeaves);

    // 4- Kullanıcının toplam yıllık izin hakkını çek ve kalan izini hesapla
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const remainingDays = user.annualLeaveDays - usedDays;

    // 5- Verileri frontend’e yolla
    res.json({
      leaves,             // frontend izin listesi için
      usedDays,           // kullanılan gün sayısı
      remainingDays,      // kalan izin günü
      totalLeaveDays: user.annualLeaveDays,  // toplam izin hakkı
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};




module.exports = {
  createLeave,
  getMyLeaves
};
