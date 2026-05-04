import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDark: true,
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
}));
