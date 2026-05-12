import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let browser set multipart boundary for FormData uploads
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const alreadyOnLogin = window.location.pathname === '/login';
      if (!alreadyOnLogin) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    // Removed 403 auto-redirect; let AuthGuard handle permission checks
    return Promise.reject(error);
  }
);

export default api;
