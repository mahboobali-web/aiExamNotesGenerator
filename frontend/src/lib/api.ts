import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(async (config) => {
  // Safely check if Authorization header exists (case-insensitive for Axios)
  const hasAuth = config.headers && (
    (typeof config.headers.has === 'function' && config.headers.has('Authorization')) ||
    config.headers.Authorization ||
    config.headers.authorization
  );

  if (!hasAuth) {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
      } else {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
  }

  // Pass refresh token to backend so it can identify the current active session
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken && config.headers) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('X-Refresh-Token', refreshToken);
    } else {
      config.headers['X-Refresh-Token'] = refreshToken;
    }
  }
  return config;
});

// To prevent infinite loops or multiple refresh requests at once
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function handleLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  try {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    window.location.href = '/login';
  } catch (logoutErr) {
    console.error('Failed to automatically log out user:', logoutErr);
  }
}

// Response interceptor to handle token expiration and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is due to an expired token
    if (error.response?.status === 401 && error.response?.data?.error === 'Unauthorized: Token expired' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = 'Bearer ' + token;
          }
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        await handleLogout();
        return Promise.reject(error);
      }

      return new Promise(function (resolve, reject) {
        axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
          .then(({ data }) => {
            const newAccessToken = data.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = 'Bearer ' + newAccessToken;
            }
            processQueue(null, newAccessToken);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            handleLogout();
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    // Handle session revocation or invalid token
    if (
      error.response?.status === 401 &&
      (error.response.data?.error?.includes('revoked') || 
       error.response.data?.error?.includes('logout') || 
       error.response.data?.error?.includes('invalid'))
    ) {
      console.warn('Session revoked or invalid. Forcing client logout...');
      await handleLogout();
    }
    
    return Promise.reject(error);
  }
);

export default api;
