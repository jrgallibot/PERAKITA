import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { initializeDatabase } from '@/database/database';
import { seedUserData } from '@/services/seedService';
import { loadThemePreference, fetchProfileFromCloud } from '@/services/settingsService';
import { syncNow } from '@/services/syncService';
import { restoreLocalSessionIfNeeded, syncPendingAuth } from '@/services/authService';
import { useNetworkStore } from '@/stores/networkStore';

let hydrateLock: Promise<void> | null = null;

async function hydrateUserData(userId: string, email?: string | null): Promise<void> {
  if (hydrateLock) return hydrateLock;

  hydrateLock = (async () => {
    const online = isSupabaseConfigured && useNetworkStore.getState().isConnected;
    if (online) {
      await syncPendingAuth();
      const activeId = useAuthStore.getState().user?.id ?? userId;
      await syncNow(activeId);
    }
    await seedUserData(useAuthStore.getState().user?.id ?? userId, email);
    if (online) {
      const activeId = useAuthStore.getState().user?.id ?? userId;
      await syncNow(activeId);
      try {
        await fetchProfileFromCloud(activeId);
      } catch {
        // Profile pull is best-effort; local seed remains available.
      }
    }
  })().finally(() => {
    hydrateLock = null;
  });

  return hydrateLock;
}

export function useAuthListener() {
  const setCloudSession = useAuthStore((s) => s.setCloudSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let mounted = true;

    async function init() {
      await initializeDatabase();
      await loadThemePreference();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        setCloudSession(session);
        await hydrateUserData(session.user.id, session.user.email);
      } else {
        const restored = await restoreLocalSessionIfNeeded();
        if (restored) {
          const user = useAuthStore.getState().user;
          if (user) await hydrateUserData(user.id, user.email);
        } else {
          setCloudSession(null);
        }
      }
      if (mounted) setInitialized(true);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCloudSession(session);
        if (event === 'SIGNED_IN') {
          await hydrateUserData(session.user.id, session.user.email);
        }
      } else if (event === 'SIGNED_OUT') {
        // Keep local offline session if one is active; clearAuth is handled by signOutAll.
        const mode = useAuthStore.getState().authMode;
        if (mode !== 'local') {
          setCloudSession(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setCloudSession, setInitialized]);
}
