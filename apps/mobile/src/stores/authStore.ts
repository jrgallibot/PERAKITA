import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type AuthMode = 'cloud' | 'local' | null;

interface AuthState {
  session: Session | null;
  user: AuthUser | null;
  authMode: AuthMode;
  loading: boolean;
  initialized: boolean;
  setCloudSession: (session: Session | null) => void;
  setLocalSession: (user: AuthUser) => void;
  clearAuth: () => void;
  /** @deprecated use setCloudSession — kept for older call sites */
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  authMode: null,
  loading: true,
  initialized: false,
  setCloudSession: (session) =>
    set({
      session,
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata as Record<string, unknown>,
          }
        : null,
      authMode: session ? 'cloud' : null,
      loading: false,
    }),
  setLocalSession: (user) =>
    set({
      session: null,
      user,
      authMode: 'local',
      loading: false,
    }),
  clearAuth: () =>
    set({
      session: null,
      user: null,
      authMode: null,
      loading: false,
    }),
  setSession: (session) =>
    set({
      session,
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata as Record<string, unknown>,
          }
        : null,
      authMode: session ? 'cloud' : null,
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
}));
