import { getDatabase, nowIso } from '@/database/database';
import { newId } from '@/database/repositories/baseRepository';
import type { Profile, ProfileInput, Sex, ThemeMode, NotificationPrefs } from '@perakita/shared';
import { DEFAULT_NOTIFICATION_PREFS } from '@perakita/shared';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/stores/themeStore';

const GLOBAL_SETTINGS_ID = 'global-settings';

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export async function loadThemePreference(): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ theme_mode: ThemeMode }>(
    'SELECT theme_mode FROM app_settings WHERE id = ?',
    [GLOBAL_SETTINGS_ID]
  );
  if (row?.theme_mode) {
    useThemeStore.getState().hydrate(row.theme_mode);
  } else {
    useThemeStore.getState().hydrate('system');
  }
}

export async function saveThemePreference(mode: ThemeMode): Promise<void> {
  const db = await getDatabase();
  const now = nowIso();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM app_settings WHERE id = ?',
    [GLOBAL_SETTINGS_ID]
  );

  if (existing) {
    await db.runAsync(
      'UPDATE app_settings SET theme_mode = ?, updated_at = ? WHERE id = ?',
      [mode, now, GLOBAL_SETTINGS_ID]
    );
  } else {
    await db.runAsync(
      `INSERT INTO app_settings (id, user_id, theme_mode, default_currency, device_id, created_at, updated_at)
       VALUES (?, NULL, ?, 'PHP', NULL, ?, ?)`,
      [GLOBAL_SETTINGS_ID, mode, now, now]
    );
  }
  useThemeStore.getState().setMode(mode);
}

export function profileToNotificationPrefs(profile: Pick<
  Profile,
  'notify_enabled' | 'notify_bills' | 'notify_loans' | 'notify_budget' | 'notify_safe_to_spend' | 'notify_goals'
>): NotificationPrefs {
  return {
    enabled: profile.notify_enabled,
    bills: profile.notify_bills,
    loans: profile.notify_loans,
    budget: profile.notify_budget,
    safeToSpend: profile.notify_safe_to_spend,
    goals: profile.notify_goals ?? true,
  };
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const profile = await getProfile(userId);
  if (!profile) return { ...DEFAULT_NOTIFICATION_PREFS };
  return profileToNotificationPrefs(profile);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    user_id: string;
    display_name: string | null;
    contact: string | null;
    address: string | null;
    birthday: string | null;
    sex: string | null;
    avatar_url: string | null;
    default_currency: string;
    notify_enabled: number | null;
    notify_bills: number | null;
    notify_loans: number | null;
    notify_budget: number | null;
    notify_safe_to_spend: number | null;
    notify_goals: number | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, user_id, display_name, contact, address, birthday, sex, avatar_url,
            default_currency, notify_enabled, notify_bills, notify_loans, notify_budget,
            notify_safe_to_spend, notify_goals, created_at, updated_at
     FROM profiles WHERE user_id = ?`,
    [userId]
  );
  if (!row) return null;
  return {
    ...row,
    sex: (row.sex as Sex | null) ?? null,
    report_email_enabled: false,
    report_email_period: 'monthly',
    report_email_last_sent_at: null,
    notify_enabled: Boolean(row.notify_enabled),
    notify_bills: row.notify_bills == null ? true : Boolean(row.notify_bills),
    notify_loans: row.notify_loans == null ? true : Boolean(row.notify_loans),
    notify_budget: row.notify_budget == null ? true : Boolean(row.notify_budget),
    notify_safe_to_spend: row.notify_safe_to_spend == null ? true : Boolean(row.notify_safe_to_spend),
    notify_goals: row.notify_goals == null ? true : Boolean(row.notify_goals),
  };
}

async function writeLocalProfile(
  userId: string,
  patch: {
    display_name: string | null;
    contact?: string | null;
    address?: string | null;
    birthday?: string | null;
    sex?: Sex | null;
    avatar_url?: string | null;
  },
  options?: { replaceOptionalFields?: boolean }
): Promise<void> {
  const db = await getDatabase();
  const now = nowIso();
  const existing = await db.getFirstAsync<{
    id: string;
    contact: string | null;
    address: string | null;
    birthday: string | null;
    sex: string | null;
    avatar_url: string | null;
  }>('SELECT id, contact, address, birthday, sex, avatar_url FROM profiles WHERE user_id = ?', [
    userId,
  ]);
  const name = patch.display_name || 'User';
  const replace = options?.replaceOptionalFields === true;
  const contact = replace ? (patch.contact ?? null) : (patch.contact ?? existing?.contact ?? null);
  const address = replace ? (patch.address ?? null) : (patch.address ?? existing?.address ?? null);
  const birthday = replace
    ? (patch.birthday ?? null)
    : (patch.birthday ?? existing?.birthday ?? null);
  const sex = replace ? (patch.sex ?? null) : (patch.sex ?? (existing?.sex as Sex | null) ?? null);
  const avatarUrl = replace
    ? (patch.avatar_url ?? existing?.avatar_url ?? null)
    : (patch.avatar_url ?? existing?.avatar_url ?? null);

  if (existing) {
    await db.runAsync(
      `UPDATE profiles
       SET display_name = ?, contact = ?, address = ?, birthday = ?, sex = ?, avatar_url = ?, updated_at = ?
       WHERE user_id = ?`,
      [name, contact, address, birthday, sex, avatarUrl, now, userId]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profiles
         (id, user_id, display_name, contact, address, birthday, sex, avatar_url, default_currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PHP', ?, ?)`,
      [newId(), userId, name, contact, address, birthday, sex, avatarUrl, now, now]
    );
  }
}

/** Keep legacy seed callers working (display name only). */
export async function upsertProfile(
  userId: string,
  displayName: string | null,
  email?: string | null
): Promise<void> {
  const name = displayName || email?.split('@')[0] || 'User';
  await writeLocalProfile(userId, { display_name: name });
}

export async function fetchProfileFromCloud(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const profile: Profile = {
    id: data.id as string,
    user_id: data.user_id as string,
    display_name: (data.display_name as string | null) ?? null,
    contact: (data.contact as string | null) ?? null,
    address: (data.address as string | null) ?? null,
    birthday: data.birthday ? String(data.birthday).slice(0, 10) : null,
    sex: (data.sex as Sex | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
    default_currency: (data.default_currency as string) ?? 'PHP',
    report_email_enabled: Boolean(data.report_email_enabled),
    report_email_period: ((data.report_email_period as string) ??
      'monthly') as Profile['report_email_period'],
    report_email_last_sent_at: (data.report_email_last_sent_at as string | null) ?? null,
    notify_enabled: Boolean(data.notify_enabled),
    notify_bills: data.notify_bills == null ? true : Boolean(data.notify_bills),
    notify_loans: data.notify_loans == null ? true : Boolean(data.notify_loans),
    notify_budget: data.notify_budget == null ? true : Boolean(data.notify_budget),
    notify_safe_to_spend:
      data.notify_safe_to_spend == null ? true : Boolean(data.notify_safe_to_spend),
    notify_goals: data.notify_goals == null ? true : Boolean(data.notify_goals),
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };

  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM profiles WHERE user_id = ?',
    [userId]
  );
  if (existing) {
    await db.runAsync(
      `UPDATE profiles
       SET display_name = ?, contact = ?, address = ?, birthday = ?, sex = ?, avatar_url = ?,
           default_currency = ?, notify_enabled = ?, notify_bills = ?, notify_loans = ?,
           notify_budget = ?, notify_safe_to_spend = ?, notify_goals = ?, updated_at = ?
       WHERE user_id = ?`,
      [
        profile.display_name,
        profile.contact,
        profile.address,
        profile.birthday,
        profile.sex,
        profile.avatar_url,
        profile.default_currency,
        profile.notify_enabled ? 1 : 0,
        profile.notify_bills ? 1 : 0,
        profile.notify_loans ? 1 : 0,
        profile.notify_budget ? 1 : 0,
        profile.notify_safe_to_spend ? 1 : 0,
        profile.notify_goals ? 1 : 0,
        profile.updated_at,
        userId,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profiles
         (id, user_id, display_name, contact, address, birthday, sex, avatar_url, default_currency,
          notify_enabled, notify_bills, notify_loans, notify_budget, notify_safe_to_spend, notify_goals,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.user_id,
        profile.display_name,
        profile.contact,
        profile.address,
        profile.birthday,
        profile.sex,
        profile.avatar_url,
        profile.default_currency,
        profile.notify_enabled ? 1 : 0,
        profile.notify_bills ? 1 : 0,
        profile.notify_loans ? 1 : 0,
        profile.notify_budget ? 1 : 0,
        profile.notify_safe_to_spend ? 1 : 0,
        profile.notify_goals ? 1 : 0,
        profile.created_at,
        profile.updated_at,
      ]
    );
  }
  return profile;
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const patch = {
    display_name: input.display_name.trim(),
    contact: emptyToNull(input.contact),
    address: emptyToNull(input.address),
    birthday: emptyToNull(input.birthday),
    sex: input.sex ?? null,
  };

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      display_name: patch.display_name,
      contact: patch.contact,
      address: patch.address,
      birthday: patch.birthday,
      sex: patch.sex,
      default_currency: 'PHP',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;

  await writeLocalProfile(userId, patch, { replaceOptionalFields: true });
  const local = await getProfile(userId);
  if (!local) throw new Error('Profile missing after save');
  return local;
}

export async function uploadAvatar(userId: string, uri: string, mimeType = 'image/jpeg'): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: mimeType,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;

  await writeLocalProfile(userId, {
    display_name: (await getProfile(userId))?.display_name ?? 'User',
    avatar_url: avatarUrl,
  });
  return avatarUrl;
}

export async function updateReportEmailPrefs(
  userId: string,
  input: { enabled: boolean; period: Profile['report_email_period'] }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      report_email_enabled: input.enabled,
      report_email_period: input.period,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs
): Promise<void> {
  const patch = {
    notify_enabled: prefs.enabled,
    notify_bills: prefs.bills,
    notify_loans: prefs.loans,
    notify_budget: prefs.budget,
    notify_safe_to_spend: prefs.safeToSpend,
    notify_goals: prefs.goals,
    updated_at: new Date().toISOString(),
  };

  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM profiles WHERE user_id = ?',
    [userId]
  );
  if (existing) {
    await db.runAsync(
      `UPDATE profiles SET notify_enabled = ?, notify_bills = ?, notify_loans = ?,
       notify_budget = ?, notify_safe_to_spend = ?, notify_goals = ?, updated_at = ? WHERE user_id = ?`,
      [
        prefs.enabled ? 1 : 0,
        prefs.bills ? 1 : 0,
        prefs.loans ? 1 : 0,
        prefs.budget ? 1 : 0,
        prefs.safeToSpend ? 1 : 0,
        prefs.goals ? 1 : 0,
        patch.updated_at,
        userId,
      ]
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId);
  if (error) throw error;
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) throw signInError;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
