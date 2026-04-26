import { create } from 'zustand';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting: boolean;
}

const EXIT_DURATION = 200;
const VISIBLE_DURATION = 3500;

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add(message, type = 'success') {
    const id = `${Date.now()}-${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type, exiting: false }] }));
    setTimeout(() => {
      // Start exit animation
      set((s) => ({
        toasts: s.toasts.map((t) => t.id === id ? { ...t, exiting: true } : t),
      }));
      // Remove from DOM after animation completes
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, EXIT_DURATION);
    }, VISIBLE_DURATION);
  },
  remove(id) {
    set((s) => ({
      toasts: s.toasts.map((t) => t.id === id ? { ...t, exiting: true } : t),
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, EXIT_DURATION);
  },
}));
