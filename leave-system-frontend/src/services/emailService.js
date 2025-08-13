// services/emailService.js

const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async (to, token, name) => {
  const resetLink = `http://localhost:5050/reset-password/${token}`;  // frontend bağlantısı

  const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',    // kendi smtp sunucun ya da mail servis sağlayıcın
    port: 587,
    secure: false,               // TLS kullanıyorsan false
    auth: {
      user: 'your@email.com',
      pass: 'yourEmailPassword'
    }
  });

  const mailOptions = {
    from: '"İzin Sistemi" <your@email.com>',
    to,
    subject: 'Şifre Sıfırlama Talebi',
    html: `
      <h2>Merhaba ${name},</h2>
      <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p><b>Not:</b> Bu bağlantı 1 saat boyunca geçerlidir.</p>
      <p>İyi günler dileriz.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendPasswordResetEmail
};
