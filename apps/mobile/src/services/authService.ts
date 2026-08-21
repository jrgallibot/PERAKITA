import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { authRepository } from '@/database/repositories/authRepository';
import { newId } from '@/lib/ids';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getWebAppLink } from '@/lib/webApp';
import { seedUserData } from '@/services/seedService';
import { syncNow } from '@/services/syncService';
import { useAuthStore, type AuthUser } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';

const LOCAL_SESSION_KEY = 'perakita.local_session.v1';
const PENDING_PASSWORD_PREFIX = 'perakita.pending_pw.';
const HASH_ROUNDS = 1200;

type LocalSessionPayload = {
  userId: string;
  email: string;
  displayName: string | null;
};

function toAuthUser(userId: string, email: string, displayName?: string | null): AuthUser {
  return {
    id: userId,
    email,
    user_metadata: displayName ? { display_name: displayName } : {},
  };
}

async function bytesToHex(bytes: Uint8Array): Promise<string> {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return bytesToHex(bytes);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  let value = `${salt}:${password}`;
  for (let i = 0; i < HASH_ROUNDS; i += 1) {
    value = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  }
  return value;
}

async function verifyPassword(password: string, salt: string, expected: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return actual === expected;
}

async function saveLocalSession(payload: LocalSessionPayload): Promise<void> {
  await SecureStore.setItemAsync(LOCAL_SESSION_KEY, JSON.stringify(payload));
}

async function readLocalSession(): Promise<LocalSessionPayload | null> {
  const raw = await SecureStore.getItemAsync(LOCAL_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSessionPayload;
  } catch {
    return null;
  }
}

async function clearLocalSession(): Promise<void> {
  await SecureStore.deleteItemAsync(LOCAL_SESSION_KEY);
}

async function savePendingPassword(userId: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(`${PENDING_PASSWORD_PREFIX}${userId}`, password);
}

async function readPendingPassword(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(`${PENDING_PASSWORD_PREFIX}${userId}`);
}

async function clearPendingPassword(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${PENDING_PASSWORD_PREFIX}${userId}`);
}

function applyLocalAuth(userId: string, email: string, displayName?: string | null): void {
  useAuthStore.getState().setLocalSession(toAuthUser(userId, email, displayName));
}

export async function restoreLocalSessionIfNeeded(): Promise<boolean> {
  const payload = await readLocalSession();
  if (!payload?.userId || !payload.email) return false;
  const cred = await authRepository.findByUserId(payload.userId);
  if (!cred) {
    await clearLocalSession();
    return false;
  }
  applyLocalAuth(cred.user_id, cred.email, cred.display_name);
  await seedUserData(cred.user_id, cred.email);
  return true;
}

export async function cacheCredentialsForOfflineLogin(input: {
  userId: string;
  email: string;
  password: string;
  displayName?: string | null;
}): Promise<void> {
  const salt = await createSalt();
  const passwordHash = await hashPassword(input.password, salt);
  await authRepository.upsertCachedLogin({
    userId: input.userId,
    email: input.email,
    passwordSalt: salt,
    passwordHash,
    displayName: input.displayName,
    supabaseUserId: input.userId,
  });
}

export async function loginOnline(email: string, password: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session?.user) throw new Error('Sign in failed.');
  await clearLocalSession();
  await cacheCredentialsForOfflineLogin({
    userId: data.session.user.id,
    email: data.session.user.email ?? email,
    password,
    displayName: (data.session.user.user_metadata?.display_name as string | undefined) ?? null,
  });
  useAuthStore.getState().setCloudSession(data.session);
}

export async function loginOffline(email: string, password: string): Promise<void> {
  const cred = await authRepository.findByEmail(email);
  if (!cred) {
    throw new Error('No offline account on this device for that email. Connect once to sign in, or register offline.');
  }
  const ok = await verifyPassword(password, cred.password_salt, cred.password_hash);
  if (!ok) throw new Error('Incorrect email or password.');
  await saveLocalSession({
    userId: cred.user_id,
    email: cred.email,
    displayName: cred.display_name,
  });
  applyLocalAuth(cred.user_id, cred.email, cred.display_name);
  await seedUserData(cred.user_id, cred.email);
}

export async function loginSmart(email: string, password: string): Promise<'cloud' | 'local'> {
  const online = useNetworkStore.getState().isConnected && isSupabaseConfigured;
  if (online) {
    try {
      await loginOnline(email, password);
      return 'cloud';
    } catch (error) {
      // Fall back to local credentials when cloud is unreachable or credentials only exist locally.
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const networkish =
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('failed to fetch') ||
        message.includes('timeout');
      if (!networkish) {
        // Still try local if this device has offline credentials (e.g. pending sync account).
        const local = await authRepository.findByEmail(email);
        if (!local) throw error;
      }
      await loginOffline(email, password);
      return 'local';
    }
  }
  await loginOffline(email, password);
  return 'local';
}

export async function registerOnline(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  if (!isSupabaseConfigured) {
    throw new Error('Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.');
  }
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { display_name: input.displayName || undefined },
      emailRedirectTo: getWebAppLink('/login'),
    },
  });
  if (error) throw error;

  if (data.session?.user) {
    await clearLocalSession();
    await cacheCredentialsForOfflineLogin({
      userId: data.session.user.id,
      email: data.session.user.email ?? input.email,
      password: input.password,
      displayName: input.displayName,
    });
    useAuthStore.getState().setCloudSession(data.session);
    await seedUserData(data.session.user.id, data.session.user.email ?? input.email);
    return { needsEmailConfirmation: false };
  }

  // Email confirmation required — create a local offline account keyed to the cloud user id when available.
  const cloudId = data.user?.id ?? newId();
  const existing = await authRepository.findByEmail(input.email);
  if (!existing) {
    const salt = await createSalt();
    const passwordHash = await hashPassword(input.password, salt);
    await authRepository.create({
      userId: cloudId,
      email: input.email,
      passwordSalt: salt,
      passwordHash,
      displayName: input.displayName ?? null,
      supabaseUserId: data.user?.id ?? null,
      authSyncStatus: data.user?.id ? 'synced' : 'pending',
    });
    if (!data.user?.id) {
      await savePendingPassword(cloudId, input.password);
    }
  }
  await saveLocalSession({
    userId: cloudId,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName ?? null,
  });
  applyLocalAuth(cloudId, input.email.trim().toLowerCase(), input.displayName ?? null);
  await seedUserData(cloudId, input.email);
  return { needsEmailConfirmation: true };
}

export async function registerOffline(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<void> {
  const existing = await authRepository.findByEmail(input.email);
  if (existing) {
    throw new Error('An account with this email already exists on this device. Sign in instead.');
  }

  const userId = newId();
  const salt = await createSalt();
  const passwordHash = await hashPassword(input.password, salt);
  await authRepository.create({
    userId,
    email: input.email,
    passwordSalt: salt,
    passwordHash,
    displayName: input.displayName ?? null,
    authSyncStatus: 'pending',
  });
  await savePendingPassword(userId, input.password);
  await saveLocalSession({
    userId,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName ?? null,
  });
  applyLocalAuth(userId, input.email.trim().toLowerCase(), input.displayName ?? null);
  await seedUserData(userId, input.email);
}

export async function registerSmart(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ mode: 'cloud' | 'local'; needsEmailConfirmation: boolean }> {
  const online = useNetworkStore.getState().isConnected && isSupabaseConfigured;
  if (online) {
    try {
      const result = await registerOnline(input);
      return {
        mode: result.needsEmailConfirmation ? 'local' : 'cloud',
        needsEmailConfirmation: result.needsEmailConfirmation,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const networkish =
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('failed to fetch') ||
        message.includes('timeout');
      if (!networkish) throw error;
    }
  }
  await registerOffline(input);
  return { mode: 'local', needsEmailConfirmation: false };
}

export async function signOutAll(): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (userId) await clearPendingPassword(userId);
  await clearLocalSession();
  useAuthStore.getState().clearAuth();
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch {
      // local clear already done
    }
  }
}

/**
 * Promote offline-created accounts to Supabase when connectivity returns.
 */
export async function syncPendingAuth(): Promise<void> {
  if (!isSupabaseConfigured || !useNetworkStore.getState().isConnected) return;

  const pending = await authRepository.findPendingSync();
  for (const cred of pending) {
    const password = await readPendingPassword(cred.user_id);
    if (!password) {
      await authRepository.markFailed(cred.user_id);
      continue;
    }

    try {
      let session: Session | null = null;
      let cloudUser: User | null = null;

      const signUp = await supabase.auth.signUp({
        email: cred.email,
        password,
        options: {
          data: { display_name: cred.display_name || undefined },
          emailRedirectTo: getWebAppLink('/login'),
        },
      });

      if (signUp.data.session?.user) {
        session = signUp.data.session;
        cloudUser = signUp.data.session.user;
      } else if (signUp.error) {
        const msg = signUp.error.message.toLowerCase();
        const exists =
          msg.includes('already') || msg.includes('registered') || msg.includes('exists');
        if (!exists) throw signUp.error;

        const signIn = await supabase.auth.signInWithPassword({
          email: cred.email,
          password,
        });
        if (signIn.error) throw signIn.error;
        session = signIn.data.session;
        cloudUser = signIn.data.user;
      } else if (signUp.data.user && !signUp.data.session) {
        // Waiting for email confirmation — keep local mode, remember cloud id if present.
        if (signUp.data.user.id) {
          await authRepository.markSynced(cred.user_id, signUp.data.user.id);
          // Keep pending password until they can sign in after confirming.
        }
        continue;
      }

      if (!session?.user || !cloudUser) continue;

      const oldId = cred.user_id;
      const newIdValue = cloudUser.id;
      if (oldId !== newIdValue) {
        await authRepository.remapUserId(oldId, newIdValue);
      }
      await authRepository.markSynced(newIdValue, newIdValue);
      await clearPendingPassword(oldId);
      await clearPendingPassword(newIdValue);
      await clearLocalSession();
      useAuthStore.getState().setCloudSession(session);
      await syncNow(newIdValue);
    } catch {
      await authRepository.markFailed(cred.user_id);
    }
  }
}
