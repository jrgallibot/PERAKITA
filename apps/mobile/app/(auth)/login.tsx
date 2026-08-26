import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { loginSchema, mapAuthError, type LoginInput } from '@perakita/shared';
import { Input, Button, AppText, Card } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { loginSmart } from '@/services/authService';
import { saveBiometricCredentials } from '@/services/biometricCredentialStore';
import { getBiometricSupport, maskEmail } from '@/services/biometricLoginService';
import {
  getQuickLoginState,
  loginWithBiometric,
  loginWithPin,
  type QuickLoginState,
} from '@/services/quickLoginService';
import { hasPin } from '@/services/pinLockService';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Fingerprint');
  const [quickLogin, setQuickLogin] = useState<QuickLoginState | null>(null);
  const [pin, setPin] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const refreshQuickLogin = useCallback(() => {
    void (async () => {
      const [support, quick] = await Promise.all([getBiometricSupport(), getQuickLoginState()]);
      setBiometricLabel(support.label);
      setQuickLogin(quick);
      if (quick.email) setValue('email', quick.email);
    })();
  }, [setValue]);

  useFocusEffect(
    useCallback(() => {
      refreshQuickLogin();
    }, [refreshQuickLogin]),
  );

  const completeSignIn = async (mode: 'cloud' | 'local') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    notify.success(mode === 'local' ? 'Signed in offline' : 'Signed in');
    router.replace('/(tabs)/home');
  };

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const mode = await loginSmart(data.email, data.password);
      if (await hasPin()) {
        await saveBiometricCredentials(data.email, data.password);
        refreshQuickLogin();
      }
      await completeSignIn(mode);
    } catch (error) {
      notify.error(mapAuthError(error instanceof Error ? error.message : 'Sign in failed.'));
    } finally {
      setLoading(false);
    }
  };

  const onBiometricSignIn = async () => {
    if (biometricLoading || loading || pinLoading) return;
    setBiometricLoading(true);
    try {
      const mode = await loginWithBiometric();
      await completeSignIn(mode);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Biometric sign-in failed.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const onPinSignIn = async () => {
    if (pinLoading || loading || biometricLoading) return;
    if (!pin.trim()) {
      notify.error('Enter your PIN');
      return;
    }
    setPinLoading(true);
    try {
      const mode = await loginWithPin(pin);
      setPin('');
      await completeSignIn(mode);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'PIN sign-in failed.');
      setPin('');
    } finally {
      setPinLoading(false);
    }
  };

  const showQuickLogin = quickLogin?.hasQuickLogin && quickLogin.email;

  const quickLoginCard = showQuickLogin ? (
    <Card elevated style={styles.quickCard}>
      <View style={styles.quickHeader}>
        <Ionicons color={colors.primary} name="flash-outline" size={20} />
        <AppText variant="subtitle">Quick sign-in</AppText>
      </View>
      <AppText muted variant="caption">
        {maskEmail(quickLogin.email!)}
      </AppText>

      <Pressable
        accessibilityLabel={`Sign in with ${biometricLabel}`}
        disabled={biometricLoading || loading || pinLoading}
        onPress={() => void onBiometricSignIn()}
        style={({ pressed }) => [
          styles.quickBtn,
          {
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.primaryMuted : colors.surfaceElevated,
            opacity: biometricLoading || loading || pinLoading ? 0.6 : 1,
          },
        ]}
      >
        <Ionicons color={colors.primary} name="finger-print" size={28} />
        <AppText variant="subtitle">
          {biometricLoading ? 'Verifying…' : `Sign in with ${biometricLabel}`}
        </AppText>
      </Pressable>

      {quickLogin.pinSaved ? (
        <>
          <Input
            keyboardType="number-pad"
            label="PIN"
            maxLength={6}
            onChangeText={setPin}
            placeholder="Your app PIN"
            secureTextEntry
            value={pin}
          />
          <Button
            loading={pinLoading}
            onPress={() => void onPinSignIn()}
            title="Sign in with PIN"
            variant="secondary"
          />
        </>
      ) : null}

      <AppText muted variant="caption" style={styles.orText}>
        or use email and password below
      </AppText>
    </Card>
  ) : null;

  return (
    <AuthShell
      beforeCard={quickLoginCard}
      footer={
        <>
          <AppText muted>Don&apos;t have an account? </AppText>
          <Link href="/(auth)/register" asChild>
            <Pressable hitSlop={12}>
              <AppText color={colors.primary} variant="link">
                Sign up
              </AppText>
            </Pressable>
          </Link>
        </>
      }
      subtitle="Sign in to continue tracking your finances — works offline on this phone."
      title="Welcome back"
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email?.message}
            keyboardType="email-address"
            label="Email"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="you@example.com"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            error={errors.password?.message}
            label="Password"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Your password"
            secureTextEntry
            secureToggle
            value={value}
          />
        )}
      />

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable hitSlop={12} style={styles.forgot}>
          <AppText color={colors.primary} variant="link">
            Forgot password?
          </AppText>
        </Pressable>
      </Link>

      <Button loading={loading} onPress={handleSubmit(onSubmit)} title="Sign In" />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  quickCard: { gap: 12 },
  quickHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  orText: { textAlign: 'center', marginTop: 4 },
  forgot: { alignSelf: 'flex-end', marginBottom: 16, minHeight: 36, justifyContent: 'center' },
});
