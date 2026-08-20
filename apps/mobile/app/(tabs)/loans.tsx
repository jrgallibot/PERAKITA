import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, getDueTodayLoanAlerts, loanPaymentTimeline, nextKinsenaWindows, todayIsoLocal } from '@perakita/shared';
import { Screen, AppText, AmountText, Card, EmptyState, IconButton, Button, Badge } from '@/components/ui';
import { DueTodayBanner } from '@/components/DueTodayBanner';
import { LoanPaymentFlow } from '@/components/LoanPaymentFlow';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { loanRepository } from '@/database/repositories/loanRepository';

function ProgressBar(props: { percent: number; color: string; track: string }) {
  const width = Math.min(100, Math.max(0, props.percent));
  return (
    <View style={[styles.track, { backgroundColor: props.track }]}>
      <View style={[styles.fill, { width: `${width}%`, backgroundColor: props.color }]} />
    </View>
  );
}

export default function LoansScreen() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['loans', user?.id],
    enabled: !!user?.id && initialized,
    queryFn: async () => {
      const [loans, totals, payments] = await Promise.all([
        loanRepository.findAll(user!.id),
        loanRepository.totals(user!.id),
        loanRepository.findAllPayments(user!.id),
      ]);
      return { loans, totals, payments };
    },
  });

  const loans = data?.loans ?? [];
  const payments = data?.payments ?? [];
  const debts = data?.totals.debts ?? 0;
  const receivables = data?.totals.receivables ?? 0;
  const dueToday = getDueTodayLoanAlerts(loans);
  const dueTodayIds = new Set(dueToday.items.map((item) => item.id));

  const deleteLoan = (loanId: string, name: string) => {
    if (!user?.id) return;
    Alert.alert('Delete loan', `Remove ${name}? This does not change your income balance.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await loanRepository.softDelete(user.id, loanId);
              await queryClient.invalidateQueries({ queryKey: ['loans'] });
              notify.deleted('Loan deleted');
            } catch (error) {
              notify.error(error instanceof Error ? error.message : 'Could not delete this loan.');
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title" style={styles.title}>
          Loans & Debts
        </AppText>
        <IconButton
          accessibilityLabel="Add loan"
          name="add"
          onPress={() => router.push('/add-loan' as never)}
        />
      </View>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <AppText muted variant="caption">
            I still owe
          </AppText>
          <AmountText amount={debts} color={colors.expense} size="small" />
        </Card>
        <Card style={styles.statCard}>
          <AppText muted variant="caption">
            Still owed to me
          </AppText>
          <AmountText amount={receivables} color={colors.income} size="small" />
        </Card>
      </View>

      <DueTodayBanner alerts={dueToday} />

      {loans.length === 0 ? (
        <EmptyState
          actionLabel="Add a loan"
          icon="people-outline"
          message="Record money you borrowed or lent. These stay off Current Balance."
          onAction={() => router.push('/add-loan' as never)}
          title="No loans yet"
        />
      ) : (
        loans.map((loan) => {
          const isDebt = loan.loan_type === 'debt';
          const closed = loan.status === 'paid' || loan.status === 'cancelled';
          const interestAmount = loan.total_amount - loan.principal_amount;
          const kinsenas = nextKinsenaWindows(todayIsoLocal());
          const percent =
            loan.total_amount > 0 ? Math.round((loan.amount_paid / loan.total_amount) * 100) : 0;
          const timeline = loanPaymentTimeline(
            loan,
            payments.filter((item) => item.loan_id === loan.id)
          );
          const dueAlert = dueToday.items.find((item) => item.id === loan.id);
          return (
            <Card key={loan.id} style={styles.card} accent={dueTodayIds.has(loan.id)}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText>{loan.person_name}</AppText>
                  <View style={styles.badges}>
                    <Badge
                      label={isDebt ? 'You borrowed' : 'You lent'}
                      variant={isDebt ? 'warning' : 'success'}
                    />
                    {dueAlert ? (
                      <Badge
                        label={dueAlert.reason === 'overdue' ? 'Past due' : 'Due today'}
                        variant={dueAlert.reason === 'kinsena' ? 'warning' : 'danger'}
                      />
                    ) : null}
                  </View>
                </View>
                <AmountText
                  amount={isDebt ? -loan.remaining_amount : loan.remaining_amount}
                  showSign
                  size="small"
                />
              </View>

              <AppText muted variant="caption">
                {loan.status.replace('_', ' ')}
                {loan.start_date && loan.due_date
                  ? ` · ${loan.start_date} → ${loan.due_date}`
                  : loan.due_date
                    ? ` · due ${loan.due_date}`
                    : ''}
              </AppText>
              <ProgressBar
                color={closed ? colors.income : colors.primary}
                percent={percent}
                track={colors.border}
              />
              <AppText muted variant="caption">
                Paid {formatCurrency(loan.amount_paid)} of {formatCurrency(loan.total_amount)} ·{' '}
                {percent}%
              </AppText>
              <AppText muted variant="caption">
                Principal {formatCurrency(loan.principal_amount)}
                {loan.interest_rate > 0
                  ? ` + ${loan.interest_rate}% / month (${formatCurrency(interestAmount)})`
                  : ' · no interest'}
              </AppText>
              <AppText muted variant="caption">
                Kinsena: 15th and month-end · 5-day allowance
                {kinsenas[0] ? ` · next due ${kinsenas[0].due}` : ''}
              </AppText>

              <AppText variant="caption" style={styles.flowLabel}>
                PAYMENT FLOW
              </AppText>
              <LoanPaymentFlow
                emptyLabel="No payments yet. Record the first one below."
                entries={timeline}
              />

              <View style={styles.actions}>
                {!closed ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      onPress={() =>
                        router.push({ pathname: '/add-loan-payment', params: { loanId: loan.id } } as never)
                      }
                      title={isDebt ? 'Record next payment' : 'Record next collection'}
                      variant="secondary"
                    />
                  </View>
                ) : (
                  <AppText muted style={{ flex: 1 }}>
                    Paid in full
                  </AppText>
                )}
                <IconButton
                  accessibilityLabel="Delete loan"
                  name="trash-outline"
                  onPress={() => deleteLoan(loan.id, loan.person_name)}
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  title: { marginBottom: 0 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, padding: 12 },
  card: { marginBottom: 16, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flowLabel: { marginTop: 8, letterSpacing: 0.6, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
});
