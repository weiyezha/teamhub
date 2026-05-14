import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Set JSON content-type for non-FormData requests; let browser handle multipart boundary for FormData
  if (config.data && !(config.data instanceof FormData)) {
    config.headers.set('Content-Type', 'application/json');
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
