import axios from 'axios';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://localhost:10000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send httpOnly secure session cookies
});

// ── Request interceptor ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const activeOrgId = localStorage.getItem('active_organization_id');
  if (activeOrgId) {
    config.headers['x-organization-id'] = activeOrgId;
  }
  return config;
});

// ── Token refresh state ────────────────────────────────────────────────────
// Prevents multiple concurrent 401s each firing their own refresh request.
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(token: string | null, error: unknown = null) {
  pendingQueue.forEach(({ resolve, reject }) =>
    token ? resolve(token) : reject(error)
  );
  pendingQueue = [];
}

// ── Response interceptor ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request until it resolves
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshRes = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = refreshRes.data?.data?.accessToken;
      if (newToken) {
        localStorage.setItem('access_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        flushQueue(newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    } catch (refreshError) {
      flushQueue(null, refreshError);
      localStorage.removeItem('access_token');
      localStorage.removeItem('active_organization_id');
      // Only hard-redirect if we are not already on the auth page
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }

    return Promise.reject(error);
  }
);

export default api;
