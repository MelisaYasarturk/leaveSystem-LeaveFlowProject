const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const {
  getDepartmentLeaves,
  approveLeave,
  rejectLeave
} = require('../controllers/manager.controller');

//sadece manager rolüne sahip kullanıcılar bu route'a erişebilir
// İzinleri listele
router.get('/leaves', authenticate, requireRole(['manager']), getDepartmentLeaves);

// Belirli bir izni onayla
router.post('/approve/:leaveId', authenticate, requireRole(['manager']), approveLeave);

// Belirli bir izni reddet (yorum ile)
router.post('/reject/:leaveId', authenticate, requireRole(['manager']), rejectLeave);

module.exports = router;