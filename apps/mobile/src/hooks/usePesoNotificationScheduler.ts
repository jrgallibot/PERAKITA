import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NotificationPrefs } from '@perakita/shared';
import { budgetRepository } from '@/database/repositories/budgetRepository';
import { loadPesoDashboard } from '@/services/pesoEngineService';
import { syncPesoNotifications } from '@/services/notificationService';
import { getNotificationPrefs } from '@/services/settingsService';

export function usePesoNotificationScheduler(userId: string | undefined) {
  const refresh = useCallback(async () => {
    if (!userId) return;
    const [snapshot, prefs, budgets] = await Promise.all([
      loadPesoDashboard(userId),
      getNotificationPrefs(userId),
      budgetRepository.findAllWithProgress(userId),
    ]);
    const budgetRows = budgets.map((b) => ({ id: b.id, name: b.name, percent: b.percent }));
    await syncPesoNotifications(snapshot, prefs, budgetRows);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);
}

export async function saveAndSyncNotifications(
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  const { updateNotificationPrefs } = await import('@/services/settingsService');
  await updateNotificationPrefs(userId, prefs);
  const [snapshot, budgets] = await Promise.all([
    loadPesoDashboard(userId),
    budgetRepository.findAllWithProgress(userId),
  ]);
  const budgetRows = budgets.map((b) => ({ id: b.id, name: b.name, percent: b.percent }));
  await syncPesoNotifications(snapshot, prefs, budgetRows);
}
