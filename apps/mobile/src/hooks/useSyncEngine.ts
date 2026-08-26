import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { syncNow } from '@/services/syncService';
import { syncPendingAuth, tryRestoreCloudSession } from '@/services/authService';
import { refreshPendingCount } from '@/database/repositories/syncQueueRepository';

export function useSyncEngine() {
  const userId = useAuthStore((s) => s.user?.id);
  const initialized = useAuthStore((s) => s.initialized);
  const isConnected = useNetworkStore((s) => s.isConnected);

  useEffect(() => {
    if (!initialized) return;
    void refreshPendingCount();
  }, [initialized]);

  useEffect(() => {
    if (!initialized || !userId || !isConnected || !isSupabaseConfigured) return;
    void (async () => {
      await syncPendingAuth();
      await tryRestoreCloudSession();
      const activeId = useAuthStore.getState().user?.id ?? userId;
      if (activeId) await syncNow(activeId);
    })();
  }, [initialized, userId, isConnected]);

  useEffect(() => {
    if (!initialized) return;
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && userId && useNetworkStore.getState().isConnected) {
        void (async () => {
          await syncPendingAuth();
          await tryRestoreCloudSession();
          const activeId = useAuthStore.getState().user?.id ?? userId;
          if (activeId) await syncNow(activeId);
        })();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [initialized, userId]);
}
