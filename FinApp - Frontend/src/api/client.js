import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5025';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar token JWT en cada petición
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('finop_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejar 401 → redirigir a login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('finop_token');
      localStorage.removeItem('finop_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
