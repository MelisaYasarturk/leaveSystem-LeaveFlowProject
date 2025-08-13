// routes/employees.js
const express = require('express');
const router = express.Router();
const EmployeeService = require('../services/employeeService');

// Tüm çalışanları getir (güncel annual leave ile)
router.get('/', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Her çalışan için güncel annual leave'i hesapla
    const employeesWithUpdatedLeave = employees.map(employee => ({
      ...employee,
      annualLeaveDays: EmployeeService.calculateAnnualLeave(employee.startDate)
    }));

    res.json(employeesWithUpdatedLeave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yeni çalışan ekle
router.post('/', async (req, res) => {
  try {
    const employee = await EmployeeService.createEmployee(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Çalışan güncelle
router.put('/:id', async (req, res) => {
  try {
    const employee = await EmployeeService.updateEmployee(
      parseInt(req.params.id), 
      req.body
    );
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manuel olarak tüm çalışanların annual leave'ini güncelle
router.post('/update-annual-leave', async (req, res) => {
  try {
    const results = await EmployeeService.updateAllAnnualLeave();
    res.json({ 
      message: 'Yıllık izinler güncellendi', 
      updatedCount: results.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;