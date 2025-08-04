// Gerekli paketleri içe aktar
const express = require('express');       // Express framework: API sunucusu kurmak için
const cors = require('cors');             // CORS middleware: frontend-backend iletişimine izin verir
const dotenv = require('dotenv');         // .env dosyasından çevresel değişkenleri okumak için

// .env dosyasındaki değişkenleri process.env içine yükle
dotenv.config();

// Express uygulamasını başlat
const app = express();

// Tüm gelen isteklerde CORS kontrolünü aktif et
app.use(cors());

// Gelen isteklerin gövdesindeki JSON verilerini okuyabilmek için
app.use(express.json());

//auth route dosyasını dahil ediyoruz
const authRoutes = require('./routes/auth.routes');
const testRoutes = require('./routes/test.routes');
const leaveRoutes = require('./routes/leave.routes');
const managerRoutes = require('./routes/manager.routes');
const hrRoutes = require('./routes/hr.routes');

//route’u kaydediyoruz: /api/auth altındaki tüm istekler authRoutes içinde tanımlanacak
app.use('/api/auth' , authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/hr', hrRoutes);

app.get('/', (req, res) => {
  res.send('API çalışıyor 🚀');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test başarılı!' });
});


// Bu app nesnesini dışa aktar – index.js dosyasında kullanacağız
module.exports = app;
