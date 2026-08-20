import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen, AppText, Input, DateInput, Button, IconButton } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { budgetRepository } from '@/database/repositories/budgetRepository';

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function currentMonthRange(): { name: string; start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const name = now.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
  return {
    name: `${name} budget`,
    start: toIsoDay(start),
    end: toIsoDay(end),
  };
}

export default function AddBudgetScreen() {
  const defaults = currentMonthRange();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [name, setName] = useState(defaults.name);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [total, setTotal] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user?.id) return;
    const parsed = parseAmount(total);
    if (!name.trim()) {
      notify.error('Give this budget a name.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter how much you can spend in this period.');
      return;
    }
    if (!start || !end || end < start) {
      notify.error('Pick a start date and an end date on or after it.');
      return;
    }

    setSaving(true);
    try {
      await budgetRepository.create(user.id, {
        name: name.trim(),
        period_start: start,
        period_end: end,
        total_amount: parsed,
      });
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
      notify.success('Budget saved');
      router.back();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save this budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
        <AppText variant="title">New budget</AppText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <AppText muted style={styles.hint}>
          Set a spending cap for a date range. You can add category limits after you save.
        </AppText>
        <Input label="Budget name" onChangeText={setName} value={name} />
        <Input
          keyboardType="decimal-pad"
          label="Total spending limit (PHP)"
          onChangeText={setTotal}
          placeholder="0.00"
          value={total}
        />
        <DateInput
          label="Starts"
          onChange={(value) => {
            setStart(value);
            if (end && end < value) setEnd(value);
          }}
          placeholder="Pick start date"
          value={start}
        />
        <DateInput
          label="Ends"
          minimumDate={parseIsoDate(start)}
          onChange={setEnd}
          placeholder="Pick end date"
          value={end}
        />
      </ScrollView>
      <View style={[styles.footerBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Button loading={saving} onPress={onSave} title="Save budget" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  body: { paddingHorizontal: 20, paddingBottom: 16 },
  hint: { marginBottom: 16, lineHeight: 20 },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
});
