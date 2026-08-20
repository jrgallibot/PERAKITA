import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, mapAuthError, type ResetPasswordInput } from '@perakita/shared';
import { supabase } from '@/lib/supabase';
import { Screen, Input, Button, AppText } from '@/components/ui';
import { notify } from '@/stores/toastStore';

export default function ResetPasswordScreen() {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const isTablet = width >= 768;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setLoading(false);
    if (error) {
      notify.error(mapAuthError(error.message));
      return;
    }
    notify.info('Password updated');
    router.replace('/(auth)/login');
  };

  return (
    <Screen>
      <View style={[styles.container, isTablet && styles.tabletContainer]}>
        <View style={styles.header}>
          <AppText variant="title">New password</AppText>
          <AppText muted>Choose a strong password for your account.</AppText>
        </View>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              error={errors.password?.message}
              label="New password"
              onBlur={onBlur}
              onChangeText={onChange}
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
              secureTextEntry
              secureToggle
              value={value}
            />
          )}
        />

        <Button loading={loading} onPress={handleSubmit(onSubmit)} title="Update Password" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 72 },
  tabletContainer: { maxWidth: 440, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 24 },
});
