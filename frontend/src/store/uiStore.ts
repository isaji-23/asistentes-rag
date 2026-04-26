import { create } from 'zustand';

interface UIState {
  leftOpen: boolean;
  rightOpen: boolean;
  darkMode: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftOpen: true,
  rightOpen: true,
  darkMode: localStorage.getItem('theme') === 'dark',
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    return { darkMode: next };
  }),
}));
