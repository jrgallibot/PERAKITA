import Constants from 'expo-constants';

type PublicEnvKey =
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  | 'EXPO_PUBLIC_WEB_APP_URL';

type ExpoExtra = Partial<Record<PublicEnvKey, string>>;

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export function getPublicEnv(key: PublicEnvKey): string {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;
  return extra[key]?.trim() ?? '';
}

export const EXPO_PUBLIC_SUPABASE_URL = getPublicEnv('EXPO_PUBLIC_SUPABASE_URL');
export const EXPO_PUBLIC_SUPABASE_ANON_KEY = getPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
export const EXPO_PUBLIC_WEB_APP_URL = getPublicEnv('EXPO_PUBLIC_WEB_APP_URL');

export const isSupabaseEnvConfigured = Boolean(
  EXPO_PUBLIC_SUPABASE_URL && EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
