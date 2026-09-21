import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
});

export const getStoredToken = () => {
  const directToken = localStorage.getItem('access_token');
  if (directToken) return directToken;

  const stored = localStorage.getItem('ayur_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user?.token) return user.token;
    } catch {
      localStorage.removeItem('ayur_user');
    }
  }
  return null;
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic token refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/token/')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${baseURL}/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccess = res.data?.access;
          if (newAccess) {
            localStorage.setItem('access_token', newAccess);
            const stored = localStorage.getItem('ayur_user');
            if (stored) {
              try {
                const user = JSON.parse(stored);
                user.token = newAccess;
                localStorage.setItem('ayur_user', JSON.stringify(user));
              } catch {
                // ignore
              }
            }
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('ayur_user');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
