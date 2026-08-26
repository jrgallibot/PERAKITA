import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_LOGIN_ENABLED_KEY = 'perakita_biometric_login_enabled';
const BIOMETRIC_LOGIN_CREDS_KEY = 'perakita_biometric_login_creds';

export type StoredBiometricCreds = { email: string; password: string };

export async function isBiometricLoginEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_LOGIN_ENABLED_KEY)) === '1';
}

export async function getBiometricLoginEmail(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_LOGIN_CREDS_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as StoredBiometricCreds).email;
  } catch {
    return null;
  }
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  await SecureStore.setItemAsync(BIOMETRIC_LOGIN_ENABLED_KEY, '1');
  await SecureStore.setItemAsync(
    BIOMETRIC_LOGIN_CREDS_KEY,
    JSON.stringify({ email: normalizedEmail, password }),
  );
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_CREDS_KEY);
}

export async function readBiometricCredentials(): Promise<StoredBiometricCreds | null> {
  const raw = await SecureStore.getItemAsync(BIOMETRIC_LOGIN_CREDS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredBiometricCreds;
  } catch {
    return null;
  }
}
