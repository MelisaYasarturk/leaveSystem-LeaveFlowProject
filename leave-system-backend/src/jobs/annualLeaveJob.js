// jobs/annualLeaveJob.js
const cron = require('node-cron');
const EmployeeService = require('../services/employeeService');

// Her 10 dakikada bir çalışsın (5 yıl tamamlandığında hemen güncellensin)
const scheduleAnnualLeaveUpdate = () => {
  cron.schedule('*/10 * * * *', async () => {
    console.log('Yıllık izin güncelleme job\'u başladı...');
    try {
      await EmployeeService.updateAllAnnualLeave();
      console.log('Yıllık izin güncelleme tamamlandı');
    } catch (error) {
      console.error('Yıllık izin güncelleme hatası:', error);
    }
  });
};

module.exports = { scheduleAnnualLeaveUpdate };