import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/'
});

// Attach access token (if present) to every request.
API.interceptors.request.use((config) => {
  // Prefer explicit access key, fall back to user object that may contain tokens
  const access = localStorage.getItem('access') || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.access;
    } catch {
      return null;
    }
  })();

  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// Response interceptor: try refresh on 401 once
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Don't attempt to refresh token for refresh endpoint itself
    if (originalRequest.url && originalRequest.url.includes('token/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Find refresh token (explicit key or in user object)
      let refresh = localStorage.getItem('refresh');
      if (!refresh) {
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          refresh = u.refresh;
        } catch {
          refresh = null;
        }
      }

      if (refresh) {
        try {
          const resp = await axios.post('http://127.0.0.1:8000/api/token/refresh/', { refresh });
          const newAccess = resp.data.access;
          // persist new access token in both common locations
          localStorage.setItem('access', newAccess);
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            if (u && typeof u === 'object') {
              u.access = newAccess;
              localStorage.setItem('user', JSON.stringify(u));
            }
          } catch {}

          // set header and retry original request
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return API(originalRequest);
        } catch (e) {
          // Refresh failed -> force logout
          console.error('Token refresh failed', e);
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          localStorage.removeItem('user');
          toast.error('Session expired — please login again');
          setTimeout(() => { window.location.href = '/login'; }, 1200);
          return Promise.reject(e);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
