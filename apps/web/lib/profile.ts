import type { Profile, ProfileInput, Sex } from '@perakita/shared';
import { supabase } from '@/lib/supabase';
import type { ReportPeriod } from '@perakita/shared';

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
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
    report_email_period: ((data.report_email_period as string) ?? 'monthly') as Profile['report_email_period'],
    report_email_last_sent_at: (data.report_email_last_sent_at as string | null) ?? null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export async function ensureProfile(userId: string, email?: string | null): Promise<Profile> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const displayName = email?.split('@')[0] || 'User';
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      display_name: displayName,
      default_currency: 'PHP',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;
  return (await fetchProfile(userId)) ?? (data as Profile);
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<Profile> {
  await ensureProfile(userId);
  const patch = {
    display_name: input.display_name.trim(),
    contact: emptyToNull(input.contact),
    address: emptyToNull(input.address),
    birthday: emptyToNull(input.birthday),
    sex: input.sex ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId);
  if (error) throw error;
  const profile = await fetchProfile(userId);
  if (!profile) throw new Error('Profile not found after update');
  return profile;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar.${ext === 'jpeg' ? 'jpg' : ext}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
  return avatarUrl;
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

export async function updateReportEmailPrefs(
  userId: string,
  input: { enabled: boolean; period: ReportPeriod }
): Promise<Profile> {
  await ensureProfile(userId);
  const { error } = await supabase
    .from('profiles')
    .update({
      report_email_enabled: input.enabled,
      report_email_period: input.period,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
  const profile = await fetchProfile(userId);
  if (!profile) throw new Error('Profile not found after update');
  return profile;
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}
