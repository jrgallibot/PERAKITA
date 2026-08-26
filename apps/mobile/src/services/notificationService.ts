import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { NotificationPrefs, PesoDashboardSnapshot } from '@perakita/shared';
import {
  billReminderTriggerDate,
  buildPesoNotificationAlerts,
} from '@perakita/shared';
import { formatCurrency } from '@perakita/shared';

type ExpoNotifications = typeof import('expo-notifications');

let notificationsModule: ExpoNotifications | null | undefined;
let handlerConfigured = false;

/** Native scheduled push works in dev/production builds, not in Expo Go (SDK 53+). */
export function areNativePushNotificationsAvailable(): boolean {
  return Platform.OS !== 'web' && Constants.appOwnership !== 'expo';
}

async function loadNotificationsModule(): Promise<ExpoNotifications | null> {
  if (!areNativePushNotificationsAvailable()) return null;
  if (notificationsModule !== undefined) return notificationsModule;

  try {
    notificationsModule = await import('expo-notifications');
    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

function permissionGranted(
  result: Awaited<ReturnType<ExpoNotifications['getPermissionsAsync']>>,
): boolean {
  const value = result as { granted?: boolean; status?: string };
  return value.granted === true || value.status === 'granted';
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (permissionGranted(existing)) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return permissionGranted(requested);
}

export async function cancelPesoNotifications(): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function syncPesoNotifications(
  snapshot: PesoDashboardSnapshot,
  prefs: NotificationPrefs,
  budgetRows?: Array<{ id: string; name: string; percent: number }>,
): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.enabled) return;
  if (!(await ensureNotificationPermissions())) return;

  if (prefs.safeToSpend) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'peso-safe-to-spend-daily',
      content: {
        title: 'Safe to spend today',
        body: `Your safe-to-spend amount today is ${formatCurrency(snapshot.safeToSpendToday)}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
  }

  const alerts = buildPesoNotificationAlerts(snapshot, prefs, budgetRows);
  for (const alert of alerts) {
    if (alert.kind === 'bill' || alert.kind === 'loan') {
      if (!alert.dueDate) continue;
      const trigger = billReminderTriggerDate(alert.dueDate);
      if (!trigger) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `peso-${alert.id}`,
        content: { title: alert.title, body: alert.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
      });
      continue;
    }

    if (alert.kind === 'budget') {
      await Notifications.scheduleNotificationAsync({
        identifier: alert.id,
        content: { title: alert.title, body: alert.body },
        trigger: null,
      });
    }
  }
}

/** @deprecated use syncPesoNotifications */
export async function scheduleDailySafeToSpend(snapshot: PesoDashboardSnapshot): Promise<void> {
  await syncPesoNotifications(snapshot, {
    enabled: true,
    bills: false,
    loans: false,
    budget: false,
    safeToSpend: true,
    goals: false,
  });
}
