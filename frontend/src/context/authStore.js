import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  isAuthenticated: !!localStorage.getItem('auth_token'),
  setAuth: (token) => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
    set({ isAuthenticated: !!token });
  },
}));
