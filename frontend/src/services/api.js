import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Handle empty 200 responses if necessary
    if (!response.data) return {};
    return response.data;
  },
  (error) => {
    // Treat 404 from data queries as empty state to prevent UI error screens
    if (error.response?.status === 404) {
      const url = error.config?.url || '';
      if (url.includes('/patients')) return Promise.resolve({ patients: [] });
      if (url.includes('/dashboard')) return Promise.resolve({ history: [], patient: null, source: 'none' });
      if (url.includes('/status')) return Promise.resolve({ status: 'unknown' });
    }

    // Log full error response for debugging
    console.error('API Error Response:', error);
    console.error('API Error Details:', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Proper error message formatting for the UI
    const message = error.response?.data?.detail 
      || error.response?.data?.message 
      || `Request to ${error.config?.url} failed with status ${error.response?.status || 'Network Error'}`;
      
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
