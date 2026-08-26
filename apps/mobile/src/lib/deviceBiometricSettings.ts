import { Alert, Linking, Platform } from 'react-native';

export async function openDeviceBiometricSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    const intents = [
      'android.settings.BIOMETRIC_ENROLL',
      'android.settings.FINGERPRINT_ENROLL',
      'android.settings.SECURITY_SETTINGS',
    ];
    for (const action of intents) {
      try {
        await Linking.sendIntent(action);
        return;
      } catch {
        // try next intent
      }
    }
  }

  Alert.alert(
    'Add fingerprint on your phone',
    Platform.OS === 'ios'
      ? 'Open Settings → Face ID & Passcode (or Touch ID & Passcode) and enroll your biometric. Then return to PeraKita.'
      : 'Open Settings → Security → Fingerprint (or Face unlock) and enroll one on this device. Then return to PeraKita.',
    [{ text: 'OK' }],
  );
}
