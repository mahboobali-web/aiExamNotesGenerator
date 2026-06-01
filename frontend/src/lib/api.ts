import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Refresh-Token'] = auth.currentUser.refreshToken;
    }
  }
  return config;
});

// Response interceptor to handle session revocation and force logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      (error.response.data?.error?.includes('revoked') || error.response.data?.error?.includes('logout'))
    ) {
      console.warn('Session revoked by server. Forcing client logout...');
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        window.location.href = '/login';
      } catch (logoutErr) {
        console.error('Failed to automatically log out user:', logoutErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
