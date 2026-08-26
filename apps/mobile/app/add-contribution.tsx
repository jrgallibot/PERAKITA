import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { savingsContributionSchema } from '@perakita/shared';
import { todayIso } from '@perakita/shared';
import { Screen, AppText, Input, Button, IconButton } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { savingsGoalRepository } from '@/database/repositories/savingsGoalRepository';

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

export default function AddContributionScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [source, setSource] = useState('Salary');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user?.id || !goalId) return;
    const parsed = savingsContributionSchema.safeParse({
      goal_id: goalId,
      amount: parseAmount(amount),
      contribution_date: date,
      source: source.trim() || null,
      notes: note.trim() || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? 'Check contribution details');
      return;
    }
    setSaving(true);
    try {
      const result = await savingsGoalRepository.addContribution(user.id, goalId, {
        amount: parsed.data.amount,
        contribution_date: parsed.data.contribution_date,
        source: parsed.data.source,
        notes: parsed.data.notes,
      });
      for (const milestone of result.milestones) {
        notify.success(savingsGoalRepository.milestoneMessage(result.goal.name, milestone.percentage));
      }
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['goal', user.id, goalId] });
      await queryClient.invalidateQueries({ queryKey: ['peso-dashboard'] });
      notify.success('Savings added');
      router.back();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save contribution');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.form}>
        <AppText variant="display">Add savings</AppText>
        <AppText muted>Record money allocated toward this goal</AppText>
        <Input label="Amount (₱)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        <Input label="Source" value={source} onChangeText={setSource} placeholder="Salary" />
        <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Weekly savings" />
        <Button loading={saving} title="Save contribution" onPress={onSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 40 },
});
