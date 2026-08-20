import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const CHUNK_SIZE = 1800;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const header = await SecureStore.getItemAsync(key);
    if (!header) return null;
    if (!header.startsWith('CHUNKED:')) return header;
    const count = Number(header.slice('CHUNKED:'.length));
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      parts.push((await SecureStore.getItemAsync(`${key}.${i}`)) ?? '');
    }
    return parts.join('');
  },
  setItem: async (key: string, value: string) => {
    const existing = await SecureStore.getItemAsync(key);
    if (existing?.startsWith('CHUNKED:')) {
      const count = Number(existing.slice('CHUNKED:'.length));
      await Promise.all(
        Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`))
      );
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(key, `CHUNKED:${chunks}`);
    for (let i = 0; i < chunks; i += 1) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
  },
  removeItem: async (key: string) => {
    const existing = await SecureStore.getItemAsync(key);
    if (existing?.startsWith('CHUNKED:')) {
      const count = Number(existing.slice('CHUNKED:'.length));
      await Promise.all(
        Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`))
      );
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
