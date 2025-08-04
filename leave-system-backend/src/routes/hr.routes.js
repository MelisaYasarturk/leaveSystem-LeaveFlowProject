//express framework'ünden router nesnesi oluştur
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

// Route dosyasını dışa aktar
module.exports = router;