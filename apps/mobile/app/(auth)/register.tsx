import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, mapAuthError, type RegisterInput } from '@perakita/shared';
import { Input, Button, AppText } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { registerSmart } from '@/services/authService';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [emailNotice, setEmailNotice] = useState(false);

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
    <AuthShell
      footer={
        <>
          <AppText muted>Already have an account? </AppText>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={12}>
              <AppText color={colors.primary} variant="link">
                Sign in
              </AppText>
            </Pressable>
          </Link>
        </>
      }
      subtitle="Create your account on this device. Data syncs to the cloud when you are online."
      title="Create account"
    >
      {emailNotice ? (
        <View style={[styles.notice, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
          <Ionicons color={colors.primary} name="mail-outline" size={20} />
          <AppText color={colors.primary} style={styles.noticeText} variant="caption">
            Check your email to verify your cloud account when online. You can keep using the app offline now.
          </AppText>
        </View>
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
          color={acceptTerms ? colors.primary : colors.textMuted}
          name={acceptTerms ? 'checkbox' : 'square-outline'}
          size={22}
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
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  noticeText: { flex: 1, fontWeight: '600', lineHeight: 18 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  termsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  termsError: { fontSize: 13, marginBottom: 12 },
});
