const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');


/**
 * HR kullanıcısı için:
 * Kullanıcıları departmanlara göre gruplandır, isimlerine göre sırala.
 * Yöneticilerin ismine (manager) etiketi ekle.
 */
const getUsersGroupedByDepartment = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        users: {
          orderBy: { name: 'asc' },
        },
      },
    });

    const result = departments.map(dept => {
      const users = dept.users.map(user => {
        const isManager = user.role === 'manager';
        return {
          id: user.id,
          name: isManager ? `${user.name} (manager)` : user.name,
          email: user.email,
          role: user.role,
        };
      });

      return {
        id: dept.id,
        name: dept.name,
        userCount: dept.users.length,
        users,
      };
    });

    res.json({ departments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};


/**
 * HR kullanıcısı için:
 * Tüm kullanıcıları tek bir listede alfabetik sırayla döndür.
 * Kullanıcının departman adı da gösterilsin.
 * Eğer manager ise isminin yanında (manager) etiketi olsun.
 */
const getAllUsersAlphabetically = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: { department: true },
    });

    const result = users.map(user => {
      const isManager = user.role === 'manager';
      return {
        id: user.id,
        name: isManager ? `${user.name} (manager)` : user.name,
        email: user.email,
        role: user.role,
        department: user.department?.name || 'Departman yok',
        departmentId: user.department?.id || null,
        isApprover: user.isApprover,
        createdAt: user.createdAt
      };
    });

    res.json({ users: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

/**
 * HR kullanıcısı bir kullanıcının rolünü değiştirebilir.
 * Örnek: employee -> manager
 */
const updateUserRole = async (req, res) => {
  const userId = Number(req.params.id);
  const { role } = req.body;

  const validRoles = ['employee', 'manager', 'hr'];

  // Geçerli rol kontrolü
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Geçersiz rol.' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    res.json({
      message: `Kullanıcının rolü '${role}' olarak güncellendi.`,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

/**
 * HR kullanıcısı bir kullanıcının departmanını değiştirebilir.
 */
const updateUserDepartment = async (req, res) => {
  const userId = Number(req.params.id);
  const { departmentId } = req.body;

  try {
    let updateData = {};
    let message = '';

    if (departmentId === '' || departmentId === null) {
      // Remove department assignment
      updateData = { departmentId: null };
      message = 'Kullanıcının departmanı kaldırıldı.';
    } else {
      // Assign to specific department
      const department = await prisma.department.findUnique({
        where: { id: Number(departmentId) },
      });

      if (!department) {
        return res.status(400).json({ message: 'Geçersiz departman ID.' });
      }

      updateData = { departmentId: Number(departmentId) };
      message = `Kullanıcının departmanı '${department.name}' olarak güncellendi.`;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { department: true },
    });

    res.json({
      message,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

/**
 * HR kullanıcısı tüm izinleri görebilir.
 * Query parametreleri ile filtreleme yapılabilir:
 * - departmentId: belirli departmandakiler
 * - status: izin durumu (PENDING, APPROVED, REJECTED)
 */
const getAllLeaves = async (req, res) => {
  const { departmentId, status } = req.query;

  try {
    const leaves = await prisma.leave.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(departmentId
          ? { user: { departmentId: Number(departmentId) } }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ leaves });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

/**
 * HR kullanıcısı, manuel olarak yeni bir kullanıcı ekleyebilir.
 * Gerekli bilgiler: name, email, password, role, departmentId
 */
const createUserByHR = async (req, res) => {
    const { name, email, password, role, departmentId } = req.body;

    const validRoles = [ 'employee', 'manager', 'hr'] ;

    //Geçerli rol kontrolü
    if (!validRoles.includes(role)) {
        return res.status(400).json({message: 'Geçersiz rol.'});
    }

    if (!name || !email || !password || !departmentId) {
        return res.status(400).json({ message: 'Tüm alanlar zorunludur.' });
   }    

   try {
    // E-posta zaten kullanılıyor mu?
    const existingUser = await prisma.user.findUnique({ where: {email} });
    if (existingUser) {
        return res.status(409).json({message: 'Bu e-posta zaten kullanılıyor'});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
            departmentId: Number(departmentId),
        },
    });

    res.status(201).json({message: 'Kullanıcı başarıyla oluşturuldu.', user});
    
   } catch (err) {
    console.error(err);
    res.status(500).json({message: 'Sunucu Hatası.'});
   }
};

/**
 * HR kullanıcısı için istatistik verileri döndürür.
 * İçerik:
 * - Toplam kullanıcı sayısı
 * - Rol bazlı kullanıcı sayıları
 * - Departmana göre kullanıcı sayısı
 * - İzin durumlarına göre sayılar
 * - Departmana göre izin sayısı
 */
const getHRStatistics = async (req, res) => {
    try {
        //toplam kullanıcı sayısı
        const totalUsers = await prisma.user.count();

        // Rol bazlı kullanıcı sayıları
        const roleCounts = await prisma.user.groupBy({
            by: ['role'],
            _count: {role: true},
        });

        // Rol bazlı sayıları hesapla
        const totalEmployees = roleCounts.find(r => r.role === 'employee')?._count.role || 0;
        const totalManagers = roleCounts.find(r => r.role === 'manager')?._count.role || 0;
        const totalHR = roleCounts.find(r => r.role === 'hr')?._count.role || 0;

// Departmana göre kullanıcı sayısı
const usersPerDepartment = await prisma.user.groupBy({
    by: ['departmentId'],
    _count: { departmentId: true },
});

//departman adlarını al
const departments = await prisma.department.findMany();

const departmentStats = await usersPerDepartment.map(dep => {
      const deptName = departments.find(d => d.id === dep.departmentId)?.name || 'Bilinmeyen';
      return {
        department: deptName,
        userCount: dep._count.departmentId,
      };
    });

//izin durumlarına göre sayılar
const leaveStatusCounts = await prisma.leave.groupBy({
    by: ['status'],
    _count: {status: true},
});

// İzin durumlarını hesapla
const pendingLeaves = leaveStatusCounts.find(l => l.status === 'PENDING')?._count.status || 0;
const approvedLeaves = leaveStatusCounts.find(l => l.status === 'APPROVED')?._count.status || 0;
const rejectedLeaves = leaveStatusCounts.find(l => l.status === 'REJECTED')?._count.status || 0;
const totalLeaves = pendingLeaves + approvedLeaves + rejectedLeaves;

// Onay oranını hesapla
const approvalRate = totalLeaves > 0 ? Math.round((approvedLeaves / totalLeaves) * 100) : 0;

//departmana göre izin sayısı
const leaves = await prisma.leave.findMany({
    include: {
        user: {include:{ department: true}},
    },
});

const leaveCountsByDepartment = {};
for (const leave of leaves) {
    const deptName = leave.user.department?.name || 'Bilinmeyen';
    if (!leaveCountsByDepartment[deptName]) {
        leaveCountsByDepartment[deptName] = 0;
      }
    leaveCountsByDepartment[deptName]++;
    }

    // JSON yanıt - Frontend'in beklediği formatta
res.json({
    totalUsers,
    totalEmployees,
    totalManagers,
    totalHR,
    totalLeaves,
    pendingLeaves,
    approvedLeaves,
    rejectedLeaves,
    approvalRate,
    roleCounts,
    usersPerDepartment: departmentStats,
    leaveStatusCounts,
    leaveCountsByDepartment,
});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
}

const deleteUser = async (req, res) => {
  const userId = Number(req.params.id);

  try {
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'Kullanıcı silindi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};


//fonksiyonları dışa aktar
module.exports = {
  getUsersGroupedByDepartment,
  getAllUsersAlphabetically,
  updateUserRole,
  updateUserDepartment,
  getAllLeaves,
  createUserByHR,
  getHRStatistics,
  deleteUser,
};
