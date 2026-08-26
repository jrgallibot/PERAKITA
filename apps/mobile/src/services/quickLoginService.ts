import { loginSmart } from '@/services/authService';
import {
  clearBiometricCredentials,
  readBiometricCredentials,
  saveBiometricCredentials,
} from '@/services/biometricCredentialStore';
import { loginWithBiometric } from '@/services/biometricLoginService';
import { hasPin, verifyPin } from '@/services/pinLockService';

export type QuickLoginState = {
  hasQuickLogin: boolean;
  pinSaved: boolean;
  email: string | null;
};

export async function getQuickLoginState(): Promise<QuickLoginState> {
  const [pinSaved, creds] = await Promise.all([hasPin(), readBiometricCredentials()]);
  return {
    hasQuickLogin: pinSaved && !!creds,
    pinSaved,
    email: creds?.email ?? null,
  };
}

export async function enableQuickLogin(email: string, password: string): Promise<void> {
  await saveBiometricCredentials(email, password);
}

export async function disableQuickLogin(): Promise<void> {
  await clearBiometricCredentials();
}

export async function loginWithPin(pin: string): Promise<'cloud' | 'local'> {
  if (!(await hasPin())) {
    throw new Error('Save an app PIN in Settings first.');
  }
  if (!(await verifyPin(pin))) {
    throw new Error('Incorrect PIN.');
  }
  const creds = await readBiometricCredentials();
  if (!creds) {
    throw new Error(
      'PIN login is not ready yet. In Settings, save your PIN and tap “Enable login with PIN & fingerprint”, or sign in once with email and password.',
    );
  }
  return loginSmart(creds.email, creds.password);
}

export { loginWithBiometric };
