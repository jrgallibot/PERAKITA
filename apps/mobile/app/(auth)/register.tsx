import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, mapAuthError, type RegisterInput } from '@perakita/shared';
import { Screen, Input, Button, AppText } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { BrandLogo } from '@/components/BrandLogo';
import { DeveloperCredit } from '@/components/DeveloperCredit';
import { useTheme } from '@/providers/ThemeProvider';
import { useNetworkStore } from '@/stores/networkStore';
import { registerSmart } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const [loading, setLoading] = useState(false);
  const [emailNotice, setEmailNotice] = useState(false);
  const isTablet = width >= 768;

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const acceptTerms = watch('acceptTerms');

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    try {
      const result = await registerSmart({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
      if (result.needsEmailConfirmation) {
        setEmailNotice(true);
        notify.success('Account ready offline — confirm email when you are online');
      } else {
        notify.success(result.mode === 'local' ? 'Account created offline' : 'Account created');
      }
      router.replace('/(tabs)/home');
    } catch (error) {
      notify.error(mapAuthError(error instanceof Error ? error.message : 'Could not create account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.container, isTablet && styles.tabletContainer]}>
        <View style={styles.header}>
          <BrandLogo showLabel size={48} />
          <AppText variant="title" style={styles.headerTitle}>
            Create account
          </AppText>
          <AppText muted>
            {isConnected
              ? 'Works offline on this phone — syncs when you reconnect'
              : 'You are offline — account will be saved on this phone and synced later'}
          </AppText>
        </View>

        {emailNotice ? (
          <AppText color={colors.primary} style={styles.emailNotice} variant="caption">
            Check your email to verify your cloud account when online. You can keep using the app offline now.
          </AppText>
        ) : null}

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full name (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Juan Dela Cruz"
              value={value}
            />
          )}
        />
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
              placeholder="At least 8 characters"
              secureTextEntry
              secureToggle
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              error={errors.confirmPassword?.message}
              label="Confirm password"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Repeat password"
              secureTextEntry
              secureToggle
              value={value}
            />
          )}
        />

        <Pressable
          onPress={() => setValue('acceptTerms', !acceptTerms, { shouldValidate: true })}
          style={styles.termsRow}
        >
          <Ionicons
            name={acceptTerms ? 'checkbox' : 'square-outline'}
            size={22}
            color={acceptTerms ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            I agree to the Terms of Service and Privacy Policy
          </Text>
        </Pressable>
        {errors.acceptTerms ? (
          <Text style={[styles.termsError, { color: colors.expense }]}>
            {errors.acceptTerms.message}
          </Text>
        ) : null}

        <Button loading={loading} onPress={handleSubmit(onSubmit)} title="Create Account" />

        <View style={styles.footer}>
          <AppText muted>Already have an account? </AppText>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={12}>
              <Text style={[styles.link, { color: colors.primary }]}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
        <DeveloperCredit />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 24 },
  tabletContainer: { maxWidth: 440, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 20, alignItems: 'center', gap: 8 },
  headerTitle: { marginTop: 4 },
  emailNotice: { textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  termsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  termsError: { fontSize: 13, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  link: { fontSize: 16, fontWeight: '600' },
});
