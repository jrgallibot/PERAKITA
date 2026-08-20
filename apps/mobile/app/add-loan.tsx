import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { calculateLoanInterest, formatCurrency, type LoanType } from '@perakita/shared';
import { Screen, AppText, Input, DateInput, Button, IconButton, PaymentModePicker } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { accountRepository } from '@/database/repositories/accountRepository';
import { loanRepository } from '@/database/repositories/loanRepository';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

export default function AddLoanScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [loanType, setLoanType] = useState<LoanType>('debt');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.id],
    enabled: !!user?.id,
    queryFn: () => accountRepository.ensureDefaults(user!.id),
  });

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const breakdown = useMemo(
    () =>
      calculateLoanInterest(parseAmount(amount) || 0, parseAmount(interestRate) || 0, {
        startDate,
        dueDate,
      }),
    [amount, interestRate, startDate, dueDate]
  );

  const onSave = async () => {
    if (!user?.id) return;
    const parsed = parseAmount(amount);
    const rate = interestRate.trim() === '' ? 0 : parseAmount(interestRate);
    if (!person.trim()) {
      notify.error('Enter the person’s name for this loan.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter an amount greater than zero.');
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      notify.error('Enter 0 or an interest percentage like 5 for 5% per month.');
      return;
    }
    if (!startDate) {
      notify.error('Pick the date this loan starts.');
      return;
    }
    if (rate > 0 && !dueDate) {
      notify.error('Pick a due date so interest can be calculated from start to due.');
      return;
    }
    if (dueDate && dueDate < startDate) {
      notify.error('Due date must be on or after the start date.');
      return;
    }
    if (!accountId) {
      notify.error('Choose a payment mode.');
      return;
    }

    setSaving(true);
    try {
      await loanRepository.create(user.id, {
        person_name: person.trim(),
        loan_type: loanType,
        amount: parsed,
        interest_rate: rate,
        start_date: startDate,
        due_date: dueDate.trim() || null,
        notes: notes.trim() || null,
        account_id: accountId,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loans'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
      notify.success('Loan saved');
      router.back();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save this loan.');
    } finally {
      setSaving(false);
    }
  };

  const isDebt = loanType === 'debt';

  return (
    <Screen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
        <AppText variant="title">{isDebt ? 'I borrowed' : 'I lent'}</AppText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.toggle}>
          {(
            [
              ['debt', 'I borrowed'],
              ['receivable', 'I lent'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setLoanType(value)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: loanType === value ? colors.primary : colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: loanType === value ? '#FFFFFF' : colors.textPrimary, fontWeight: '700' }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <AppText muted style={styles.hint}>
          {isDebt
            ? 'This is a debt record only — it does not add to Current Balance. Pay every 15th and month-end, with 5 days allowance before interest penalty.'
            : 'This is a loan record only — it does not change Current Balance. Collect every 15th and month-end, with 5 days allowance before interest penalty.'}
        </AppText>

        <Input
          autoCapitalize="words"
          label={isDebt ? 'Who did you borrow from?' : 'Who did you lend to?'}
          onChangeText={setPerson}
          placeholder="e.g. Juan"
          value={person}
        />
        <Input
          keyboardType="decimal-pad"
          label={isDebt ? 'Principal borrowed (PHP)' : 'Principal lent (PHP)'}
          onChangeText={setAmount}
          placeholder="0.00"
          value={amount}
        />
        <Input
          keyboardType="decimal-pad"
          label={isDebt ? 'Interest per month (%)' : 'Interest per month (%)'}
          onChangeText={setInterestRate}
          placeholder="e.g. 5 for 5% per 30 days"
          value={interestRate}
        />
        <DateInput
          label="From"
          onChange={(value) => {
            setStartDate(value);
            if (dueDate && dueDate < value) setDueDate('');
          }}
          placeholder="Start date"
          value={startDate}
        />
        <DateInput
          label="Due date"
          minimumDate={parseIsoDate(startDate)}
          onChange={setDueDate}
          optional={parseAmount(interestRate) <= 0}
          placeholder="Pick a due date"
          value={dueDate}
        />

        {breakdown.principal > 0 ? (
          <View style={[styles.preview, { backgroundColor: colors.primaryMuted, borderColor: colors.border }]}>
            <AppText muted variant="caption">
              INTEREST CALCULATION
            </AppText>
            {dueDate ? (
              <>
                <AppText>
                  {breakdown.days} day{breakdown.days === 1 ? '' : 's'} ({breakdown.months} month
                  {breakdown.months === 1 ? '' : 's'}) × {breakdown.interestRate}% per month
                </AppText>
                <AppText>
                  {formatCurrency(breakdown.principal)} × {breakdown.interestRate}% × {breakdown.months} ={' '}
                  {formatCurrency(breakdown.interest)} interest
                </AppText>
              </>
            ) : (
              <AppText muted>Pick a due date to calculate interest from the start date.</AppText>
            )}
            <AppText>
              {isDebt ? 'Total to pay back' : 'Total to collect'}: {formatCurrency(breakdown.total)}
            </AppText>
            <AppText muted variant="caption">
              Remaining includes interest. Current Balance on Home stays income minus expenses only.
            </AppText>
          </View>
        ) : null}
        <Input
          label="Notes (optional)"
          onChangeText={setNotes}
          placeholder="Reason or terms"
          value={notes}
        />

        <PaymentModePicker
          accounts={accounts}
          label={isDebt ? 'PAYMENT MODE THAT RECEIVED THE MONEY' : 'PAYMENT MODE THE MONEY CAME FROM'}
          onAccountsChanged={() => void queryClient.invalidateQueries({ queryKey: ['accounts'] })}
          onSelect={setAccountId}
          selectedId={accountId}
          userId={user?.id ?? ''}
        />
      </ScrollView>
      <View style={[styles.footerBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Button loading={saving} onPress={onSave} title="Save loan" />
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
  toggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  hint: { marginBottom: 16, lineHeight: 20 },
  preview: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    marginBottom: 12,
  },
  sectionLabel: { marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
});
