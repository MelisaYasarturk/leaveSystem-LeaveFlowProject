// services/employeeService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EmployeeService {
  // Tek bir çalışan için yıllık izin hesapla
  static calculateAnnualLeave(startDate) {
    const now = new Date();
    const diffTime = Math.abs(now - new Date(startDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;
    
    return years >= 5 ? 28 : 20;
  }

  // Tüm çalışanların yıllık iznini güncelle
  static async updateAllAnnualLeave() {
    try {
      const employees = await prisma.employee.findMany();
      
      const updatePromises = employees.map(employee => {
        const newAnnualLeave = this.calculateAnnualLeave(employee.startDate);
        
        if (employee.annualLeaveDays !== newAnnualLeave) {
          return prisma.employee.update({
            where: { id: employee.id },
            data: { annualLeaveDays: newAnnualLeave }
          });
        }
        return null;
      });

      const results = await Promise.all(updatePromises.filter(p => p !== null));
      console.log(`${results.length} çalışanın yıllık izni güncellendi`);
      return results;
    } catch (error) {
      console.error('Yıllık izin güncelleme hatası:', error);
      throw error;
    }
  }

  // Yeni çalışan ekleme
  static async createEmployee(data) {
    const annualLeaveDays = this.calculateAnnualLeave(data.startDate);
    
    return await prisma.employee.create({
      data: {
        ...data,
        annualLeaveDays
      }
    });
  }

  // Çalışan güncelleme
  static async updateEmployee(id, data) {
    let updateData = { ...data };
    
    // Eğer startDate güncelleniyorsa, annualLeaveDays'i yeniden hesapla
    if (data.startDate) {
      updateData.annualLeaveDays = this.calculateAnnualLeave(data.startDate);
    }

    return await prisma.employee.update({
      where: { id },
      data: updateData
    });
  }
}

module.exports = EmployeeService;