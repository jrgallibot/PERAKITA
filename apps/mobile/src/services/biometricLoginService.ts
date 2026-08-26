import * as LocalAuthentication from 'expo-local-authentication';
import { loginSmart } from '@/services/authService';
import {
  clearBiometricCredentials,
  getBiometricLoginEmail,
  isBiometricLoginEnabled,
  readBiometricCredentials,
  saveBiometricCredentials,
} from '@/services/biometricCredentialStore';

export { getBiometricLoginEmail, isBiometricLoginEnabled } from '@/services/biometricCredentialStore';

export interface BiometricSupport {
  available: boolean;
  enrolled: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
  label: string;
}

function resolveBiometricLabel(
  types: LocalAuthentication.AuthenticationType[],
): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris scan';
  }
  return 'Biometric';
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  const [hasHardware, enrolled, types, securityLevel] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);

  const hasBiometricLevel =
    securityLevel >= LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK;
  const label = resolveBiometricLabel(types);

  return {
    available: hasHardware || types.length > 0 || hasBiometricLevel,
    enrolled: enrolled || hasBiometricLevel,
    securityLevel,
    label,
  };
}

export async function testBiometric(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    biometricsSecurityLevel: 'weak',
  });
  return result.success;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || !local) return email;
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(4, local.length - 2))}@${domain}`;
}

async function authenticateUser(promptMessage: string): Promise<boolean> {
  return testBiometric(promptMessage);
}

export async function enableBiometricLogin(email: string, password: string): Promise<void> {
  const support = await getBiometricSupport();
  const ok = await authenticateUser(`Confirm ${support.label.toLowerCase()} to enable quick sign-in`);
  if (!ok) throw new Error('Biometric verification cancelled.');

  await saveBiometricCredentials(email, password);
}

export async function disableBiometricLogin(): Promise<void> {
  await clearBiometricCredentials();
}

export async function loginWithBiometric(): Promise<'cloud' | 'local'> {
  const creds = await readBiometricCredentials();
  if (!creds) {
    throw new Error('Sign in once with email and password to activate fingerprint login.');
  }

  const support = await getBiometricSupport();
  const ok = await authenticateUser(`Sign in with ${support.label.toLowerCase()}`);
  if (!ok) throw new Error('Biometric verification cancelled.');

  return loginSmart(creds.email, creds.password);
}
