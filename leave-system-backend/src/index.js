require('dotenv').config(); 

// app.js içindeki Express uygulamasını al (middleware, router vs. burada tanımlanmıştı)
const app = require('./app');

const PORT = 5050;

// PORT numarasını .env dosyasından al, yoksa 5000 olarak kullan
//const PORT = process.env.PORT || 5050;

// Sunucuyu başlat – belirlenen port üzerinden API dinlemeye başlar
app.listen(PORT, () => {
  console.log(`✅ Sunucu calisiyor: http://localhost:${PORT}`);
});
 