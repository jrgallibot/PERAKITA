import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, type OnboardingInput } from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { Screen, Input, Button, AppText } from '@/components/ui';
import { BrandLogo } from '@/components/BrandLogo';
import { financialProfileRepository } from '@/database/repositories/financialProfileRepository';
import { upsertProfile } from '@/services/settingsService';
import { accountRepository } from '@/database/repositories/accountRepository';
import { notify } from '@/stores/toastStore';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export default function OnboardingScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      display_name: '',
      currency: 'PHP',
      current_money: 0,
      income_source: 'Salary',
      income_amount: 0,
      income_frequency: 'monthly',
      next_payday: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    },
  });

  const frequency = watch('income_frequency');

  const onSubmit = async (data: OnboardingInput) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await upsertProfile(user.id, data.display_name, user.email);
      await financialProfileRepository.upsert(user.id, {
        currency: data.currency,
        current_money: data.current_money,
        income_source: data.income_source,
        income_amount: data.income_amount,
        income_frequency: data.income_frequency,
        next_payday: data.next_payday,
        onboarding_completed: true,
      });
      const accounts = await accountRepository.ensureDefaults(user.id);
      const cash = accounts.find((a) => a.type === 'cash');
      if (cash && data.current_money > 0) {
        const delta = data.current_money - cash.current_balance;
        if (delta !== 0) await accountRepository.adjustBalance(cash.id, delta);
      }
      notify.success('Welcome to PeraKita!');
      router.replace('/(tabs)/home');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo size={48} />
          <AppText variant="title" style={{ marginTop: 16 }}>
            Know where your money goes
          </AppText>
          <AppText muted variant="caption" style={{ marginTop: 8, textAlign: 'center' }}>
            Set up your financial profile to unlock safe-to-spend insights.
          </AppText>
        </View>

        {step === 0 ? (
          <View style={styles.form}>
            <Controller
              control={control}
              name="display_name"
              render={({ field: { onChange, value } }) => (
                <Input label="Your name" value={value} onChangeText={onChange} error={errors.display_name?.message} />
              )}
            />
            <Controller
              control={control}
              name="current_money"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Current available money (₱)"
                  keyboardType="decimal-pad"
                  value={value ? String(value) : ''}
                  onChangeText={(t) => onChange(parseFloat(t) || 0)}
                  error={errors.current_money?.message}
                />
              )}
            />
            <Button title="Continue" onPress={() => setStep(1)} />
          </View>
        ) : (
          <View style={styles.form}>
            <Controller
              control={control}
              name="income_source"
              render={({ field: { onChange, value } }) => (
                <Input label="Primary income source" value={value} onChangeText={onChange} error={errors.income_source?.message} />
              )}
            />
            <Controller
              control={control}
              name="income_amount"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Income amount (₱)"
                  keyboardType="decimal-pad"
                  value={value ? String(value) : ''}
                  onChangeText={(t) => onChange(parseFloat(t) || 0)}
                  error={errors.income_amount?.message}
                />
              )}
            />
            <AppText variant="label" style={{ marginBottom: 8 }}>
              Income frequency
            </AppText>
            <View style={styles.chips}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  title={opt.label}
                  variant={frequency === opt.value ? 'primary' : 'secondary'}
                  onPress={() => setValue('income_frequency', opt.value)}
                  style={{ flex: 1, minWidth: '45%' }}
                />
              ))}
            </View>
            <Controller
              control={control}
              name="next_payday"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Next expected payday (YYYY-MM-DD)"
                  value={value}
                  onChangeText={onChange}
                  error={errors.next_payday?.message}
                />
              )}
            />
            <Button title="Get started" loading={loading} onPress={handleSubmit(onSubmit)} />
            <Button title="Back" variant="ghost" onPress={() => setStep(0)} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 48 },
  header: { alignItems: 'center', marginBottom: 32 },
  form: { gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
});
