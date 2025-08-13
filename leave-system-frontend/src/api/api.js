
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5050/api', // BACKEND URL
});

const token = localStorage.getItem('token') || sessionStorage.getItem('token');

// Her isteğe token ekle (login sonrası otomatik gönderim için)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// YENİ: Annual leave güncelleme endpoint'leri
const AnnualLeaveAPI = {
  // Tüm çalışanların yıllık iznini güncelle
  updateAllAnnualLeave: () => API.post('/employees/update-annual-leave'),
  
  // Manager'ın ekip üyelerinin yıllık iznini güncelle  
  updateTeamAnnualLeave: () => API.post('/manager/update-team-annual-leave'),
  
  // Çalışanın profil bilgilerini çek (start date dahil)
  getUserProfile: () => API.get('/user/profile'),
  
  // Çalışanın güncel yıllık izin bilgilerini çek
  getUpdatedLeaveBalance: () => API.get('/leave/balance'),
};

export default API;
export { AnnualLeaveAPI };