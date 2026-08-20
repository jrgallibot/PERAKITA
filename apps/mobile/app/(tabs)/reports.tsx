import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { useTheme } from '@/providers/ThemeProvider';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import { budgetRepository } from '@/database/repositories/budgetRepository';
import { loanRepository } from '@/database/repositories/loanRepository';
import { syncNow } from '@/services/syncService';
import {
  Screen,
  Card,
  AppText,
  EmptyState,
  StatCard,
  SectionHeader,
  HeroBalanceCard,
} from '@/components/ui';
import { SpendingDonut } from '@/components/charts/SpendingDonut';
import { TrendBarChart } from '@/components/charts/TrendBarChart';
import { BudgetProgressBars } from '@/components/charts/BudgetProgressBars';

function monthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: now.toLocaleString('en-PH', { month: 'long', year: 'numeric' }),
  };
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const month = monthRange();

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['stats-dashboard', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [balance, totals, spending, dailyTrend, budgets, loanTotals, txCount] = await Promise.all([
        transactionRepository.getIncomeExpenseBalance(user!.id),
        transactionRepository.getMonthlyTotals(user!.id, month.start, month.end),
        transactionRepository.getSpendingBreakdown(user!.id, month.start, month.end),
        transactionRepository.getDailyTrend(user!.id, 14),
        budgetRepository.findAllWithProgress(user!.id),
        loanRepository.totals(user!.id),
        transactionRepository.countAll(user!.id),
      ]);
      return { balance, totals, spending, dailyTrend, budgets, loanTotals, txCount };
    },
  });

  const onRefresh = useCallback(async () => {
    if (user?.id && isConnected) {
      await syncNow(user.id);
    }
    await refetch();
  }, [refetch, user?.id, isConnected]);

  const balance = data?.balance ?? 0;
  const income = data?.totals.income ?? 0;
  const expenses = data?.totals.expenses ?? 0;
  const net = income - expenses;
  const spending = data?.spending ?? [];
  const dailyTrend = data?.dailyTrend ?? [];
  const budgets = data?.budgets ?? [];
  const loanTotals = data?.loanTotals ?? { debts: 0, receivables: 0 };

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <AppText variant="label" muted>
            Analytics
          </AppText>
          <AppText variant="display" style={styles.title}>
            Dashboard
          </AppText>
          <AppText muted variant="caption">
            {month.label} · charts, trends, and summaries
          </AppText>
        </View>

        <View style={styles.content}>
          <HeroBalanceCard
            amount={balance}
            hint="Your running balance from income and expenses."
            label="Total balance"
          />

          <View style={styles.statsGrid}>
            <StatCard amount={income} icon="arrow-up-circle-outline" label="Income" tone="income" />
            <StatCard amount={expenses} icon="arrow-down-circle-outline" label="Expenses" tone="expense" />
            <StatCard amount={net} icon="pulse-outline" label="Net" showSign tone={net >= 0 ? 'income' : 'expense'} />
            <StatCard icon="receipt-outline" label="Transactions" tone="primary" value={String(data?.txCount ?? 0)} />
          </View>

          <SectionHeader
            subtitle="Daily income compared to expenses"
            title="14-day cash flow"
          />
          <Card>
            {dailyTrend.some((point) => point.income > 0 || point.expense > 0) ? (
              <TrendBarChart points={dailyTrend} />
            ) : (
              <EmptyState
                icon="bar-chart-outline"
                message="No transactions in the last 14 days."
                title="No activity yet"
              />
            )}
          </Card>

          <SectionHeader subtitle={month.label} title="Spending by category" />
          <Card style={styles.chartCard}>
            {spending.length === 0 ? (
              <EmptyState
                icon="pie-chart-outline"
                message="Add expenses to see a breakdown by category."
                title="No spending yet"
              />
            ) : (
              <>
                <SpendingDonut slices={spending} />
                <View style={styles.legend}>
                  {spending.map((item) => (
                    <View key={item.name} style={[styles.legendRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <View style={styles.legendText}>
                        <AppText variant="subtitle">{item.name}</AppText>
                        <AppText muted variant="caption">
                          {item.percent}% share
                        </AppText>
                      </View>
                      <AppText variant="subtitle">{formatCurrency(item.total)}</AppText>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>

          <SectionHeader subtitle="How much of each budget is used" title="Budget progress" />
          <Card>
            <BudgetProgressBars
              budgets={budgets.map((budget) => ({
                id: budget.id,
                name: budget.name,
                total_amount: budget.total_amount,
                spent: budget.spent,
              }))}
            />
          </Card>

          <SectionHeader subtitle="Tracked separately from daily balance" title="Loans overview" />
          <View style={styles.statsGrid}>
            <StatCard amount={loanTotals.debts} hint="Outstanding debt" icon="alert-circle-outline" label="You owe" tone="expense" />
            <StatCard amount={loanTotals.receivables} hint="Expected back" icon="cash-outline" label="Owed to you" tone="income" />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 28 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, lineHeight: 34 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chartCard: { alignItems: 'center' },
  legend: { width: '100%', marginTop: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, gap: 2 },
});
