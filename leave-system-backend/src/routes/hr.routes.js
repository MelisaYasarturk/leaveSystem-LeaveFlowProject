/*//express framework'ünden router nesnesi oluştur
const express = require('express');
const router = express.Router();

// Giriş kontrolü (JWT) ve rol kontrolü (HR) middleware'lerini al
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

// Controller'daki fonksiyonları içe aktar
const {
    getUsersGroupedByDepartment,
    getAllUsersAlphabetically,
    updateUserRole,
    updateUserDepartment,
    getAllLeaves,
    createUserByHR,
    getHRStatistics,
    deleteUser,
} = require('../controllers/hr.controller');

// EmployeeService'i içe aktar
const EmployeeService = require('../services/employeeService');

// GET /api/hr/departments , Kullanıcıları departmanlara göre gruplar
router.get('/departments', authenticate, requireRole(['hr']), getUsersGroupedByDepartment);

//GET /api/hr/all-users , Tüm kullanıcıları tek bir alfabetik listede getirir.
router.get('/all-users', authenticate, requireRole(['hr']), getAllUsersAlphabetically);

//rol güncelleme
router.put('/users/:id/role', authenticate, requireRole(['hr']), updateUserRole);

//departman güncelleme
router.put('/users/:id/department', authenticate, requireRole(['hr']), updateUserDepartment);

//tüm izinleri, izin durumlarını görebilir
router.get('/leaves', authenticate, requireRole(['hr']), getAllLeaves);

// Kullanıcı ekleme (sadece HR erişebilir)
router.post('/users', authenticate, requireRole(['hr']), createUserByHR);

// HR için istatistik verileri
router.get('/statistics', authenticate, requireRole(['hr']), getHRStatistics);

// DELETE /api/hr/users/:id
router.delete('/users/:id', authenticate, requireRole(['hr']), deleteUser);

// Manuel olarak tüm çalışanların izin günlerini güncelle
router.post('/update-leave-days', authenticate, requireRole(['hr']), async (req, res) => {
  try {
    console.log('HR update-leave-days endpoint çağrıldı');
    
    const result = await EmployeeService.manualUpdateAllLeave();
    console.log('Update sonucu:', result);
    
    res.json({ 
      message: 'Tüm çalışanların izin günleri güncellendi', 
      updatedCount: result.updatedCount || 0
    });
  } catch (error) {
    console.error('İzin güncelleme hatası detayı:', error);
    res.status(500).json({ 
      message: 'İzin güncelleme hatası', 
      error: error.message
    });
  }
});

// Belirli bir kullanıcının izin durumunu getir
router.get('/users/:id/leave-status', authenticate, requireRole(['hr']), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const leaveStatus = await EmployeeService.getUserLeaveStatus(userId);
    
    if (!leaveStatus) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    res.json(leaveStatus);
  } catch (error) {
    console.error('İzin durumu getirme hatası:', error);
    res.status(500).json({ message: 'İzin durumu getirme hatası', error: error.message });
  }
});

// Test için: Kullanıcının start date'ini güncelle (sadece test ortamında)
router.put('/users/:id/start-date', authenticate, requireRole(['hr']), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { startDate } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ message: 'Start date gerekli' });
    }
    
    const updatedUser = await EmployeeService.updateUser(userId, { startDate: new Date(startDate) });
    
    res.json({ 
      message: 'Start date güncellendi', 
      user: updatedUser,
      newLeaveDays: EmployeeService.calculateAnnualLeave(new Date(startDate))
    });
  } catch (error) {
    console.error('Start date güncelleme hatası:', error);
    res.status(500).json({ message: 'Start date güncelleme hatası', error: error.message });
  }
});

// Tüm kullanıcıların start date'lerini getir (debug için)
router.get('/users/start-dates', authenticate, requireRole(['hr']), async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        startDate: true,
        annualLeaveDays: true
      }
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Start date listesi getirme hatası:', error);
    res.status(500).json({ message: 'Start date listesi getirme hatası', error: error.message });
  }
});

// Route dosyasını dışa aktar
module.exports = router;*/

const express = require('express');
const router = express.Router();

const { authenticate, requireHRorHRManager } = require('../middlewares/auth.middleware');

const {
    getUsersGroupedByDepartment,
    getAllUsersAlphabetically,
    updateUserRole,
    updateUserDepartment,
    getAllLeaves,
    createUserByHR,
    getHRStatistics,
    deleteUser,
} = require('../controllers/hr.controller');

const EmployeeService = require('../services/employeeService');

// Departmana göre kullanıcılar
router.get('/departments', authenticate, requireHRorHRManager, getUsersGroupedByDepartment);

// Tüm kullanıcılar
router.get('/all-users', authenticate, requireHRorHRManager, getAllUsersAlphabetically);

// Rol güncelle
router.put('/users/:id/role', authenticate, requireHRorHRManager, updateUserRole);

// Departman güncelle
router.put('/users/:id/department', authenticate, requireHRorHRManager, updateUserDepartment);

// Tüm izinler
router.get('/leaves', authenticate, requireHRorHRManager, getAllLeaves);

// Kullanıcı ekleme
router.post('/users', authenticate, requireHRorHRManager, createUserByHR);

// İstatistikler
router.get('/statistics', authenticate, requireHRorHRManager, getHRStatistics);

// Kullanıcı silme
router.delete('/users/:id', authenticate, requireHRorHRManager, deleteUser);

// Manuel izin güncelleme
router.post('/update-leave-days', authenticate, requireHRorHRManager, async (req, res) => {
  try {
    const result = await EmployeeService.manualUpdateAllLeave();
    res.json({ 
      message: 'Tüm çalışanların izin günleri güncellendi', 
      updatedCount: result ? result.length : 0,
      result
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'İzin güncelleme hatası', 
      error: error.message
    });
  }
});

module.exports = router;
