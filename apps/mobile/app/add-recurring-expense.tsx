import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { recurringExpenseSchema } from '@perakita/shared';
import { Screen, AppText, Input, Button, IconButton, DateInput } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { recurringExpenseRepository } from '@/database/repositories/recurringExpenseRepository';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

export default function AddRecurringExpenseScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [nextDue, setNextDue] = useState(todayIso);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user?.id) return;
    const parsed = recurringExpenseSchema.safeParse({
      name: name.trim(),
      amount: parseAmount(amount),
      frequency: 'monthly',
      next_due_date: nextDue,
      payment_method: 'Cash',
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? 'Check recurring expense details');
      return;
    }
    setSaving(true);
    try {
      await recurringExpenseRepository.create(user.id, parsed.data);
      await queryClient.invalidateQueries({ queryKey: ['peso-dashboard'] });
      notify.success('Recurring expense saved');
      router.back();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.form}>
        <AppText variant="display">Recurring expense</AppText>
        <Input label="Name" value={name} onChangeText={setName} placeholder="Internet" />
        <Input label="Amount (₱)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <DateInput
          label="Next due date"
          minimumDate={new Date()}
          onChange={setNextDue}
          placeholder="Select due date"
          value={nextDue}
        />
        <Button loading={saving} title="Save recurring expense" onPress={onSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 40 },
});
