import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, mapAuthError, type ForgotPasswordInput } from '@perakita/shared';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getWebAppLink } from '@/lib/webApp';
import { Screen, Input, Button, AppText } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const isTablet = width >= 768;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    if (!isSupabaseConfigured) {
      notify.error('Supabase environment variables are not set.');
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
    <Screen>
      <View style={[styles.container, isTablet && styles.tabletContainer]}>
        <View style={styles.header}>
          <AppText variant="title">Reset password</AppText>
          <AppText muted>
            {sent
              ? 'If an account exists, we sent reset instructions to your email.'
              : 'Enter your email and we will send reset instructions.'}
          </AppText>
        </View>

        {!sent && (
          <>
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
            <Button loading={loading} onPress={handleSubmit(onSubmit)} title="Send Reset Link" />
          </>
        )}

        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.back}>
            <Text style={[styles.link, { color: colors.primary }]}>Back to Sign In</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 72 },
  tabletContainer: { maxWidth: 440, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 24 },
  back: { marginTop: 24, alignItems: 'center' },
  link: { fontSize: 16, fontWeight: '600' },
});
