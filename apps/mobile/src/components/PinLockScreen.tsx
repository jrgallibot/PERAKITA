import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Screen, AppText, Input, Button } from '@/components/ui';
import { verifyPin, isBiometricEnabled } from '@/services/pinLockService';
import { getBiometricSupport } from '@/services/biometricLoginService';
import { useTheme } from '@/providers/ThemeProvider';

interface PinLockScreenProps {
  onUnlock: () => void;
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);
  const [biometricReady, setBiometricReady] = useState(false);

  const tryBiometricUnlock = useCallback(async () => {
    if (!(await isBiometricEnabled())) return;
    const support = await getBiometricSupport();
    if (!support.available || !support.enrolled) return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock PeraKita',
      cancelLabel: 'Use PIN',
    });
    if (result.success) onUnlock();
  }, [onUnlock]);

  useEffect(() => {
    void (async () => {
      const [enabled, support] = await Promise.all([isBiometricEnabled(), getBiometricSupport()]);
      if (enabled && support.available && support.enrolled) {
        setBiometricLabel(support.label);
        setBiometricReady(true);
        await tryBiometricUnlock();
      }
    })();
  }, [tryBiometricUnlock]);

  const onSubmit = async () => {
    const ok = await verifyPin(pin);
    if (ok) {
      setError(null);
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <Screen>
      <View style={styles.center}>
        <AppText variant="display">Enter PIN</AppText>
        <AppText muted variant="caption" style={styles.subtitle}>
          Your app is locked for security
        </AppText>
        <Input
          label="PIN"
          secureTextEntry
          keyboardType="number-pad"
          value={pin}
          onChangeText={setPin}
          error={error ?? undefined}
        />
        <Button title="Unlock" onPress={() => void onSubmit()} />
        {biometricReady && biometricLabel ? (
          <Pressable
            accessibilityLabel={`Unlock with ${biometricLabel}`}
            onPress={() => void tryBiometricUnlock()}
            style={({ pressed }) => [
              styles.biometricBtn,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.primaryMuted : colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons color={colors.primary} name="finger-print" size={28} />
            <AppText variant="subtitle">Use {biometricLabel}</AppText>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 16, padding: 24 },
  subtitle: { textAlign: 'center', marginBottom: 4 },
  biometricBtn: {
    marginTop: 8,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
});
