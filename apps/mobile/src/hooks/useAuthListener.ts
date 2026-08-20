import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { initializeDatabase } from '@/database/database';
import { seedUserData } from '@/services/seedService';
import { loadThemePreference, fetchProfileFromCloud } from '@/services/settingsService';
import { syncNow } from '@/services/syncService';
import { useNetworkStore } from '@/stores/networkStore';

let hydrateLock: Promise<void> | null = null;

async function hydrateUserData(userId: string, email?: string | null): Promise<void> {
  if (hydrateLock) return hydrateLock;

  hydrateLock = (async () => {
    const online = isSupabaseConfigured && useNetworkStore.getState().isConnected;
    if (online) {
      await syncNow(userId);
    }
    await seedUserData(userId, email);
    if (online) {
      await syncNow(userId);
      try {
        await fetchProfileFromCloud(userId);
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
  const setSession = useAuthStore((s) => s.setSession);
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

      setSession(session);
      if (session?.user) {
        await hydrateUserData(session.user.id, session.user.email);
      }
      if (mounted) setInitialized(true);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        await hydrateUserData(session.user.id, session.user.email);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setInitialized]);
}
