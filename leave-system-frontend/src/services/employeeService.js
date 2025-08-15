// services/employeeService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EmployeeService {
  // Tek bir çalışan için yıllık izin hesapla
  static calculateAnnualLeave(startDate) {
    const now = new Date();
    const start = new Date(startDate);
    
    // Yıl, ay ve gün olarak hesapla (daha hassas)
    const yearDiff = now.getFullYear() - start.getFullYear();
    const monthDiff = now.getMonth() - start.getMonth();
    const dayDiff = now.getDate() - start.getDate();
    
    // Tam yıl hesaplama
    let yearsOfService = yearDiff;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      yearsOfService--;
    }
    
    // 5 yıl tamamlandıysa 28 gün, değilse 14 gün
    return yearsOfService >= 5 ? 28 : 14;
  }

  // Tüm çalışanların yıllık iznini güncelle (hem User hem Employee modelleri için)
  static async updateAllAnnualLeave() {
    try {
      console.log('updateAllAnnualLeave başladı...');
      
      // User modelindeki çalışanları güncelle
      const users = await prisma.user.findMany();
      console.log(`${users.length} kullanıcı bulundu`);
      
      const userUpdatePromises = users.map(user => {
        try {
          const newAnnualLeave = this.calculateAnnualLeave(user.startDate);
          console.log(`User ${user.id} (${user.name}): ${user.annualLeaveDays} -> ${newAnnualLeave}`);
          
          if (user.annualLeaveDays !== newAnnualLeave) {
            return prisma.user.update({
              where: { id: user.id },
              data: { annualLeaveDays: newAnnualLeave }
            });
          }
          return null;
        } catch (userError) {
          console.error(`User ${user.id} güncelleme hatası:`, userError);
          return null;
        }
      });

      // Employee modelindeki çalışanları güncelle
      const employees = await prisma.employee.findMany();
      console.log(`${employees.length} employee bulundu`);
      
      const employeeUpdatePromises = employees.map(employee => {
        try {
          const newAnnualLeave = this.calculateAnnualLeave(employee.startDate);
          console.log(`Employee ${employee.id} (${employee.name}): ${employee.annualLeaveDays} -> ${newAnnualLeave}`);
          
          if (employee.annualLeaveDays !== newAnnualLeave) {
            return prisma.employee.update({
              where: { id: employee.id },
              data: { annualLeaveDays: newAnnualLeave }
            });
          }
          return null;
        } catch (employeeError) {
          console.error(`Employee ${employee.id} güncelleme hatası:`, employeeError);
          return null;
        }
      });

      const allUpdatePromises = [...userUpdatePromises, ...employeeUpdatePromises];
      const validPromises = allUpdatePromises.filter(p => p !== null);
      console.log(`${validPromises.length} güncelleme promise'i hazırlandı`);
      
      if (validPromises.length === 0) {
        console.log('Güncellenecek kullanıcı bulunamadı');
        return [];
      }
      
      const results = await Promise.all(validPromises);
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

  // User modelindeki çalışan güncelleme
  static async updateUser(id, data) {
    let updateData = { ...data };
    
    // Eğer startDate güncelleniyorsa, annualLeaveDays'i yeniden hesapla
    if (data.startDate) {
      updateData.annualLeaveDays = this.calculateAnnualLeave(data.startDate);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData
    });
  }

  // Belirli bir kullanıcının yıllık izin durumunu getir
  static async getUserLeaveStatus(userId) {
    try {
      // Önce User modelinde ara
      let user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          startDate: true,
          annualLeaveDays: true,
          role: true
        }
      });

      if (!user) {
        // User modelinde bulunamazsa Employee modelinde ara
        user = await prisma.employee.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            startDate: true,
            annualLeaveDays: true,
            role: true
          }
        });
      }

      if (user) {
        const yearsOfService = this.calculateYearsOfService(user.startDate);
        const expectedLeaveDays = this.calculateAnnualLeave(user.startDate);
        
        return {
          ...user,
          yearsOfService: Math.round(yearsOfService * 100) / 100,
          expectedLeaveDays,
          needsUpdate: user.annualLeaveDays !== expectedLeaveDays
        };
      }

      return null;
    } catch (error) {
      console.error('Kullanıcı izin durumu getirme hatası:', error);
      throw error;
    }
  }

  // Çalışma yılını hesapla
  static calculateYearsOfService(startDate) {
    const now = new Date();
    const start = new Date(startDate);
    
    // Yıl, ay ve gün olarak hesapla (daha hassas)
    const yearDiff = now.getFullYear() - start.getFullYear();
    const monthDiff = now.getMonth() - start.getMonth();
    const dayDiff = now.getDate() - start.getDate();
    
    // Tam yıl hesaplama
    let yearsOfService = yearDiff;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      yearsOfService--;
    }
    
    // Ondalık kısmı da hesapla (ay bazında)
    let decimalPart = 0;
    if (monthDiff >= 0) {
      decimalPart = monthDiff / 12;
      if (dayDiff >= 0) {
        decimalPart += dayDiff / 365.25;
      }
    } else {
      decimalPart = (12 + monthDiff) / 12;
      if (dayDiff >= 0) {
        decimalPart += dayDiff / 365.25;
      }
    }
    
    return yearsOfService + decimalPart;
  }

  // Manuel olarak tüm çalışanların izin günlerini güncelle (test için)
  static async manualUpdateAllLeave() {
    try {
      console.log('Manuel izin güncelleme başladı...');
      const result = await this.updateAllAnnualLeave();
      console.log('Manuel izin güncelleme tamamlandı, sonuç:', result);
      return result;
    } catch (error) {
      console.error('Manuel izin güncelleme hatası:', error);
      throw error;
    }
  }
}

module.exports = EmployeeService;