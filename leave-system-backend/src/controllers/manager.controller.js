const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Kendi departmanındaki tüm izinleri getir
const getDepartmentLeaves = async (req, res) => {
  try {
    const managerId = req.user.id;

    // 1. Önce yöneticinin departmanını bul
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      include: { department: true },
    });

    if (!manager || !manager.departmentId) {
      return res.status(403).json({ message: 'Departman bilgisi bulunamadı.' });
    }

    // 2. Query parametresinden status değeri al (örneğin ?status=PENDING)
    const { status } = req.query;

    // 3. Filtreleme koşulu hazırla
    const whereFilter = {
      user: {
        departmentId: manager.departmentId,
      },
    };

    if (status) {
      whereFilter.status = status.toUpperCase(); // Örn: "pending" -> "PENDING"
    }

    // 4. İzinleri getir
    const leaves = await prisma.leave.findMany({
      where: whereFilter,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ leaves });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

//izni onayla
const approveLeave = async (req, res) => {
    console.log('Approve endpoint çalıştı, params:', req.params);
    const {leaveId} = req.params;

    try{
        const updatedLeave = await prisma.leave.update({
            where: {id: Number(leaveId)},
            data: {status: 'APPROVED'},
        });

        res.json({ message: 'İzin onaylandı ✅', leave: updatedLeave });
    } catch (err){
        console.error(err);
        res.status(500).json({message: 'Sunucu hatası'});
    }
};

//izni reddet
const rejectLeave = async (req, res) => {
    console.log('Reject endpoint çalıştı, params:', req.params, 'body:', req.body);
    const { leaveId } = req.params;
    const { comment } = req.body;

    try{
        const updatedLeave = await prisma.leave.update({
            where: {id: Number(leaveId)},
            data: {
                status: 'REJECTED',
                comment: comment || '', // yorum varsa ekle
            },
        });

        res.json({message:  'İzin reddedildi ❌', leave: updatedLeave});
    } catch(err){
        console.error(err);
        res.status(500).json({message: 'Sunucu hatası'});
    }
};

module.exports = {
  getDepartmentLeaves,
  rejectLeave,
  approveLeave
};
