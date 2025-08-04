
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

export default API;
