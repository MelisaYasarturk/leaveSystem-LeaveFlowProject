// E-posta gönderimi için servis
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // E-posta konfigürasyonu
    this.config = {
      service: 'SendGrid', //  Gmail yerine SendGrid kullanıyoruz
      auth: {
        user: 'apikey', //  SendGrid için hep "apikey"
        pass: process.env.SENDGRID_API_KEY //  .env dosyasından API key
      }
    };

    console.log('Email Service Config:', {
      service: 'SendGrid',
      user: this.config.auth.user,
      pass: this.config.auth.pass ? '***' : 'NOT SET'
    });
  }

  // Şifre sıfırlama e-postası gönder
  async sendPasswordResetEmail(email, resetToken, userName) {
    try {
      console.log('Attempting to send password reset email to:', email);

      // Nodemailer transporter oluştur
      const transporter = nodemailer.createTransport(this.config);

      // E-posta içeriği
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const emailContent = {
        from: `"LeaveFlow" <mel.leaveflow@gmail.com>`, // ✅ verified sender
        to: email,
        subject: 'Şifre Sıfırlama - LeaveFlow',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white;">
              <h1 style="margin: 0;">LeaveFlow</h1>
              <p style="margin: 10px 0 0 0;">Şifre Sıfırlama</p>
            </div>
            
            <div style="padding: 30px; background: #003e24ff;">
              <h2 style="color: #333; margin-bottom: 20px;">Merhaba ${userName},</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı 1 saat süreyle geçerlidir.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          display: inline-block;
                          font-weight: bold;">
                  Şifremi Sıfırla
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Eğer bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.
              </p>
              
              <p style="color: #666; line-height: 1.6;">
                Bu bağlantı çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayabilirsiniz:
              </p>
              
              <p style="color: #667eea; word-break: break-all; font-size: 12px;">
                ${resetUrl}
              </p>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">© 2024 LeaveFlow. Tüm hakları saklıdır.</p>
            </div>
          </div>
        `
      };

      // E-posta gönder
      const info = await transporter.sendMail(emailContent);
      console.log('E-posta başarıyla gönderildi:', info.messageId);

      return true;
    } catch (error) {
      console.error('E-posta gönderimi hatası:', error);
      throw error;
    }
  }

  // Hoş geldin e-postası gönder
  async sendWelcomeEmail(email, userName) {
    try {
      const transporter = nodemailer.createTransport(this.config);

      const emailContent = {
        from: `"LeaveFlow" <mel.leaveflow@gmail.com>`, // ✅ verified sender
        to: email,
        subject: "LeaveFlow'a Hoş Geldiniz!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white;">
              <h1 style="margin: 0;">LeaveFlow</h1>
              <p style="margin: 10px 0 0 0;">Hoş Geldiniz!</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Merhaba ${userName},</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                LeaveFlow ailesine hoş geldiniz! Artık izin yönetim sistemimizi kullanabilirsiniz.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          display: inline-block;
                          font-weight: bold;">
                  Sisteme Giriş Yap
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6;">
                Herhangi bir sorunuz olursa, lütfen bizimle iletişime geçin.
              </p>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">© 2024 LeaveFlow. Tüm hakları saklıdır.</p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(emailContent);
      console.log('Hoş geldin e-postası başarıyla gönderildi:', info.messageId);
      return true;
    } catch (error) {
      console.error('E-posta gönderimi hatası:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
