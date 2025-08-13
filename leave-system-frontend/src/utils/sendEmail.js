// utils/sendEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // Gmail adresin
    pass: process.env.EMAIL_PASS       // Uygulama şifren
  }
});

const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: `"LeaveFlow" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
