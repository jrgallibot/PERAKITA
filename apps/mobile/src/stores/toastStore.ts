import { create } from 'zustand';

export type NoticeKind = 'success' | 'error' | 'info' | 'deleted';

type Notice = {
  id: number;
  kind: NoticeKind;
  title: string;
};

interface ToastState {
  notice: Notice | null;
  show: (kind: NoticeKind, title: string) => void;
  hide: () => void;
}

let timeout: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  notice: null,
  show: (kind, title) => {
    const id = Date.now();
    set({ notice: { id, kind, title } });
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      set((state) => (state.notice?.id === id ? { notice: null } : state));
    }, 2800);
  },
  hide: () => set({ notice: null }),
}));

export const notify = {
  success: (title: string) => useToastStore.getState().show('success', title),
  error: (title: string) => useToastStore.getState().show('error', title),
  info: (title: string) => useToastStore.getState().show('info', title),
  deleted: (title: string) => useToastStore.getState().show('deleted', title),
};
