import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, mapAuthError, type ForgotPasswordInput } from '@perakita/shared';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getWebAppLink } from '@/lib/webApp';
import { Input, Button, AppText } from '@/components/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useNetworkStore } from '@/stores/networkStore';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const canResetOnline = isConnected && isSupabaseConfigured;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    if (!canResetOnline) {
      notify.error('Connect to the internet to reset your password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: getWebAppLink('/reset-password'),
    });
    setLoading(false);
    if (error) {
      notify.error(mapAuthError(error.message));
      return;
    }
    notify.success('Reset email sent');
    setSent(true);
  };

  return (
    <AuthShell
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={12}>
            <AppText color={colors.primary} variant="link">
              Back to Sign In
            </AppText>
          </Pressable>
        </Link>
      }
      showBrand={false}
      subtitle={
        sent
          ? 'If an account exists, we sent reset instructions to your email.'
          : 'Enter your email and we will send reset instructions when you are online.'
      }
      title="Reset password"
    >
      {!canResetOnline ? (
        <View style={[styles.offlineNotice, { backgroundColor: `${colors.expense}18`, borderColor: colors.expense }]}>
          <Ionicons color={colors.expense} name="cloud-offline-outline" size={22} />
          <AppText color={colors.expense} style={styles.offlineText} variant="caption">
            Password reset requires an internet connection. Sign in offline with your saved account, or reconnect and try again.
          </AppText>
        </View>
      ) : null}

      {sent ? (
        <View style={[styles.successNotice, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
          <Ionicons color={colors.primary} name="checkmark-circle-outline" size={24} />
          <AppText color={colors.primary} style={styles.successText} variant="caption">
            Check your inbox and spam folder. The link opens in your browser to set a new password.
          </AppText>
        </View>
      ) : (
        <>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                autoCapitalize="none"
                autoComplete="email"
                editable={canResetOnline}
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
          <Button
            disabled={!canResetOnline}
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            title="Send Reset Link"
          />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  offlineText: { flex: 1, fontWeight: '600', lineHeight: 18 },
  successNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  successText: { flex: 1, fontWeight: '600', lineHeight: 18 },
});
