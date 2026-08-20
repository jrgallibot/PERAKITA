import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  evaluateKinsenaPayment,
  formatCurrency,
  loanPaymentTimeline,
  nextKinsenaWindows,
} from '@perakita/shared';
import { Screen, AppText, Input, Button, IconButton, DateInput, Card, PaymentModePicker, Badge } from '@/components/ui';
import { LoanPaymentFlow } from '@/components/LoanPaymentFlow';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { accountRepository } from '@/database/repositories/accountRepository';
import { loanRepository } from '@/database/repositories/loanRepository';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

export default function AddLoanPaymentScreen() {
  const { loanId } = useLocalSearchParams<{ loanId?: string }>();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: loan } = useQuery({
    queryKey: ['loan', user?.id, loanId],
    enabled: !!user?.id && !!loanId,
    queryFn: () => loanRepository.findById(user!.id, loanId!),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['loan-payments', user?.id, loanId],
    enabled: !!user?.id && !!loanId,
    queryFn: () => loanRepository.findPayments(user!.id, loanId!),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.id],
    enabled: !!user?.id,
    queryFn: () => accountRepository.ensureDefaults(user!.id),
  });

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const kinsena = useMemo(() => {
    if (!loan) return null;
    return evaluateKinsenaPayment(paymentDate, loan.remaining_amount, loan.interest_rate);
  }, [loan, paymentDate]);

  const upcoming = useMemo(() => nextKinsenaWindows(paymentDate), [paymentDate]);
  const timeline = useMemo(
    () => (loan ? loanPaymentTimeline(loan, payments) : []),
    [loan, payments]
  );
  const percent =
    loan && loan.total_amount > 0 ? Math.round((loan.amount_paid / loan.total_amount) * 100) : 0;
  const closed = loan?.status === 'paid' || loan?.status === 'cancelled';
  const isDebt = loan?.loan_type === 'debt';

  const onSave = async () => {
    if (!user?.id || !loanId) return;
    const parsed = parseAmount(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a payment greater than zero.');
      return;
    }
    if (!paymentDate) {
      notify.error('Pick the date you paid.');
      return;
    }
    const method = accounts.find((account) => account.id === accountId)?.name ?? 'Cash';
    if (!accountId) {
      notify.error('Choose Cash, GCash, Maya, Bank, or another payment mode.');
      return;
    }

    setSaving(true);
    try {
      await loanRepository.recordPayment(user.id, loanId, parsed, accountId, paymentDate, method);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loans'] }),
        queryClient.invalidateQueries({ queryKey: ['loan'] }),
        queryClient.invalidateQueries({ queryKey: ['loan-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
      setAmount('');
      notify.success('Payment recorded');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save this payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
        <AppText variant="title">{isDebt ? 'Pay debt' : 'Collect payment'}</AppText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card style={styles.summary}>
          <AppText variant="caption" muted>
            1. LOAN
          </AppText>
          <AppText>{loan?.person_name ?? 'Loading…'}</AppText>
          {loan ? (
            <>
              <Badge
                label={isDebt ? 'You borrowed' : 'You lent'}
                variant={isDebt ? 'warning' : 'success'}
              />
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.min(100, percent)}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
              <AppText muted variant="caption">
                Remaining {formatCurrency(loan.remaining_amount)} of {formatCurrency(loan.total_amount)}{' '}
                · paid {formatCurrency(loan.amount_paid)} ({percent}%)
              </AppText>
              <AppText muted variant="caption">
                Principal {formatCurrency(loan.principal_amount)}
                {loan.interest_rate > 0 ? ` · ${loan.interest_rate}% per month` : ' · no interest'}
              </AppText>
              {loan.start_date || loan.due_date ? (
                <AppText muted variant="caption">
                  {loan.start_date ?? '—'} → {loan.due_date ?? 'no due date'}
                </AppText>
              ) : null}
            </>
          ) : null}
        </Card>

        <AppText variant="caption" muted style={styles.step}>
          2. PAYMENT FLOW
        </AppText>
        <LoanPaymentFlow
          emptyLabel="Nothing recorded yet. Add the first payment below."
          entries={timeline}
        />

        {closed ? (
          <Card>
            <AppText>This loan is paid in full.</AppText>
          </Card>
        ) : (
          <>
            <AppText variant="caption" muted style={styles.step}>
              3. RECORD NEXT PAYMENT
            </AppText>
            <AppText muted variant="caption" style={styles.rate}>
              Kinsena dues: every 15th and end of month. 5-day allowance after each due.
            </AppText>
            {upcoming.map((window) => (
              <AppText key={window.due} muted variant="caption">
                {window.label}: due {window.due} · pay until {window.graceEnds}
              </AppText>
            ))}

            <Input
              keyboardType="decimal-pad"
              label={isDebt ? 'Amount paying (PHP)' : 'Amount collected (PHP)'}
              onChangeText={setAmount}
              placeholder="0.00"
              value={amount}
            />
            <DateInput
              label="Payment date"
              onChange={setPaymentDate}
              placeholder="Pick payment date"
              value={paymentDate}
            />

            <PaymentModePicker
              accounts={accounts}
              label="PAYMENT MODE"
              onAccountsChanged={() => void queryClient.invalidateQueries({ queryKey: ['accounts'] })}
              onSelect={setAccountId}
              selectedId={accountId}
              userId={user?.id ?? ''}
            />

            {kinsena ? (
              <View
                style={[
                  styles.preview,
                  {
                    backgroundColor: kinsena.late ? '#FEF2F2' : colors.primaryMuted,
                    borderColor: kinsena.late ? colors.expense : colors.border,
                  },
                ]}
              >
                {kinsena.late ? (
                  <>
                    <AppText>Late after the 5-day allowance from the {kinsena.periodLabel}.</AppText>
                    <AppText>
                      Due {kinsena.dueDate} · grace ended {kinsena.graceEnds} · penalty{' '}
                      {formatCurrency(kinsena.penalty)} at {loan?.interest_rate}%
                    </AppText>
                  </>
                ) : (
                  <AppText>
                    Within the 5-day allowance for the {kinsena.periodLabel} (due {kinsena.dueDate}, until{' '}
                    {kinsena.graceEnds}). No penalty.
                  </AppText>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      {closed ? null : (
        <View style={[styles.footerBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button disabled={!loan} loading={saving} onPress={onSave} title="Save payment" />
        </View>
      )}
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
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  summary: { gap: 8, marginBottom: 16 },
  step: { letterSpacing: 0.6, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  rate: { marginBottom: 8, lineHeight: 18 },
  preview: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4, marginBottom: 16, marginTop: 4 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
});
