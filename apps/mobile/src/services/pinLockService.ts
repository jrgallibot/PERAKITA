import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { testBiometric } from '@/services/biometricLoginService';

const PIN_HASH_KEY = 'perakita_pin_hash';
const BIOMETRIC_KEY = 'perakita_biometric_enabled';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function hasPin(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return !!hash;
}

export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must be 4–6 digits');
  await SecureStore.setItemAsync(PIN_HASH_KEY, await hashPin(pin));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!stored) return false;
  return stored === (await hashPin(pin));
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await setBiometricEnabled(false);
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    if (!(await hasPin())) {
      throw new Error('Save a PIN first before enabling biometric unlock.');
    }
    const ok = await testBiometric('Confirm fingerprint to enable app unlock');
    if (!ok) {
      throw new Error('Biometric verification cancelled.');
    }
  }
  await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? '1' : '0');
}
