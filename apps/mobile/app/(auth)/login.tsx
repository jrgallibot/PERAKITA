import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { APP_TAGLINE, loginSchema, mapAuthError, type LoginInput } from '@perakita/shared';
import { Screen, Input, Button, AppText, Card } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { BrandLogo } from '@/components/BrandLogo';
import { DeveloperCredit } from '@/components/DeveloperCredit';
import { useTheme } from '@/providers/ThemeProvider';
import { useNetworkStore } from '@/stores/networkStore';
import { loginSmart } from '@/services/authService';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const [loading, setLoading] = useState(false);
  const isTablet = width >= 768;
  const compact = height < 720;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const mode = await loginSmart(data.email, data.password);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      notify.success(mode === 'local' ? 'Signed in offline' : 'Signed in');
      router.replace('/(tabs)/home');
    } catch (error) {
      notify.error(mapAuthError(error instanceof Error ? error.message : 'Sign in failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.container, isTablet && styles.tabletContainer]}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <BrandLogo labelVariant="display" showLabel size={compact ? 52 : 64} />
          <AppText muted style={styles.tagline}>
            {APP_TAGLINE}
          </AppText>
          {!isConnected ? (
            <AppText color={colors.primary} style={styles.offlineBadge} variant="caption">
              Offline mode — sign in with an account saved on this device
            </AppText>
          ) : null}
        </View>

        <Card elevated style={styles.formCard}>
          <AppText variant="title" style={styles.formTitle}>
            Welcome back
          </AppText>
          <AppText muted variant="caption" style={styles.formSubtitle}>
            Sign in to continue tracking your finances — works offline on this phone.
          </AppText>

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
        </Card>

        <View style={styles.footer}>
          <AppText muted>Don&apos;t have an account? </AppText>
          <Link href="/(auth)/register" asChild>
            <Pressable hitSlop={12}>
              <AppText color={colors.primary} variant="link">
                Sign up
              </AppText>
            </Pressable>
          </Link>
        </View>
        <DeveloperCredit />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 12, paddingBottom: 8 },
  tabletContainer: { maxWidth: 440, alignSelf: 'center', width: '100%' },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  headerCompact: { marginBottom: 16, marginTop: 0 },
  brand: { fontSize: 30, marginTop: 12, marginBottom: 6 },
  tagline: { textAlign: 'center', paddingHorizontal: 12 },
  offlineBadge: { marginTop: 10, textAlign: 'center', fontWeight: '600' },
  formCard: { marginBottom: 8 },
  formTitle: { marginBottom: 4 },
  formSubtitle: { marginBottom: 16 },
  forgot: { alignSelf: 'flex-end', marginBottom: 16, minHeight: 36, justifyContent: 'center' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 },
});
