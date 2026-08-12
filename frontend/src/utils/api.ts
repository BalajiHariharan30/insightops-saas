import axios from 'axios';

// Resolve host from environment variable (set in .env → VITE_API_BASE_URL)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string ?? 'http://localhost:10000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send httpOnly secure session cookies
});

// Automatically inject access token + active organization ID into headers
api.interceptors.request.use((config) => {
  // Attach Bearer access token for all authenticated requests
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Inject the active tenant organization context
  const activeOrgId = localStorage.getItem('active_organization_id');
  if (activeOrgId) {
    config.headers['x-organization-id'] = activeOrgId;
  }
  return config;
});

// Handle global authentication failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Attempt automatic refresh token rotation on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        // Store the new access token and retry the original request
        const newToken = refreshRes.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('access_token', newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('active_organization_id');
        // Do not force redirect if we are already on the auth page
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
