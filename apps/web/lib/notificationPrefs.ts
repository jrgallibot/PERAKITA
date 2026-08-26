import type { NotificationPrefs, Profile } from '@perakita/shared';
import { DEFAULT_NOTIFICATION_PREFS } from '@perakita/shared';
import { supabase } from '@/lib/supabase';

const STORAGE_PREFIX = 'perakita:notify:';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function profileToNotificationPrefs(
  profile: Pick<
    Profile,
    'notify_enabled' | 'notify_bills' | 'notify_loans' | 'notify_budget' | 'notify_safe_to_spend' | 'notify_goals'
  >
): NotificationPrefs {
  return {
    enabled: profile.notify_enabled,
    bills: profile.notify_bills,
    loans: profile.notify_loans,
    budget: profile.notify_budget,
    safeToSpend: profile.notify_safe_to_spend,
    goals: profile.notify_goals ?? true,
  };
}

function readLocalPrefs(userId: string): NotificationPrefs | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NotificationPrefs;
  } catch {
    return null;
  }
}

function writeLocalPrefs(userId: string, prefs: NotificationPrefs): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notify_enabled, notify_bills, notify_loans, notify_budget, notify_safe_to_spend, notify_goals')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('fetchNotificationPrefs failed, using cached/default prefs', error);
    return readLocalPrefs(userId) ?? { ...DEFAULT_NOTIFICATION_PREFS };
  }
  if (data) {
    const prefs = profileToNotificationPrefs({
      notify_enabled: Boolean(data.notify_enabled),
      notify_bills: data.notify_bills == null ? true : Boolean(data.notify_bills),
      notify_loans: data.notify_loans == null ? true : Boolean(data.notify_loans),
      notify_budget: data.notify_budget == null ? true : Boolean(data.notify_budget),
      notify_safe_to_spend:
        data.notify_safe_to_spend == null ? true : Boolean(data.notify_safe_to_spend),
      notify_goals: data.notify_goals == null ? true : Boolean(data.notify_goals),
    });
    writeLocalPrefs(userId, prefs);
    return prefs;
  }
  return readLocalPrefs(userId) ?? { ...DEFAULT_NOTIFICATION_PREFS };
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs
): Promise<void> {
  writeLocalPrefs(userId, prefs);
  const { error } = await supabase
    .from('profiles')
    .update({
      notify_enabled: prefs.enabled,
      notify_bills: prefs.bills,
      notify_loans: prefs.loans,
      notify_budget: prefs.budget,
      notify_safe_to_spend: prefs.safeToSpend,
      notify_goals: prefs.goals,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}
