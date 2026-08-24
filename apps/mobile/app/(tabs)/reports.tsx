import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  buildBudgetStats,
  buildPeriodTrend,
  formatCurrency,
  getReportPeriodRange,
  REPORT_PERIOD_OPTIONS,
  type ReportPeriod,
} from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { useTheme } from '@/providers/ThemeProvider';
import { notify } from '@/stores/toastStore';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import { budgetRepository } from '@/database/repositories/budgetRepository';
import { loanRepository } from '@/database/repositories/loanRepository';
import { syncNow } from '@/services/syncService';
import { sendFinanceReportEmail } from '@/services/reportEmailService';
import {
  Screen,
  Card,
  AppText,
  EmptyState,
  StatCard,
  SectionHeader,
  HeroBalanceCard,
  Button,
} from '@/components/ui';
import { SpendingDonut } from '@/components/charts/SpendingDonut';
import { TrendBarChart } from '@/components/charts/TrendBarChart';
import { BudgetProgressBars } from '@/components/charts/BudgetProgressBars';

export default function ReportsScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [emailing, setEmailing] = useState(false);
  const range = useMemo(() => getReportPeriodRange(period), [period]);

  useEffect(() => {
    if (!user?.id || !isConnected) return;
    void sendFinanceReportEmail({ mode: 'auto_if_due' }).catch(() => {
      // Best-effort auto notify when online.
    });
  }, [user?.id, isConnected]);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['stats-dashboard', user?.id, period, range.start, range.end],
    enabled: !!user?.id,
    queryFn: async () => {
      const [balance, totals, spending, trendRows, budgets, loanTotals, txCount, budgetSpend] =
        await Promise.all([
          transactionRepository.getIncomeExpenseBalance(user!.id),
          transactionRepository.getMonthlyTotals(user!.id, range.start, range.end),
          transactionRepository.getSpendingBreakdown(user!.id, range.start, range.end),
          transactionRepository.getTrendInRange(user!.id, range.start, range.end),
          budgetRepository.findAllWithProgress(user!.id),
          loanRepository.totals(user!.id),
          transactionRepository.countAll(user!.id),
          transactionRepository.getBudgetSpendInRange(user!.id, range.start, range.end),
        ]);
      return {
        balance,
        totals,
        spending,
        trend: buildPeriodTrend(trendRows, range),
        budgets,
        loanTotals,
        txCount,
        budgetSpend,
      };
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
  const trend = data?.trend ?? [];
  const budgets = data?.budgets ?? [];
  const loanTotals = data?.loanTotals ?? { debts: 0, receivables: 0 };
  const budgetSpend = data?.budgetSpend ?? 0;
  const budgetStats = buildBudgetStats(
    budgets.map((budget) => ({
      id: budget.id,
      name: budget.name,
      total_amount: budget.total_amount,
      spent: budget.spent,
    }))
  );

  const emailReport = async () => {
    if (!isConnected) {
      notify.error('Connect to the internet to email your report.');
      return;
    }
    if (!user?.email) {
      notify.error('Sign in with an email account to receive reports.');
      return;
    }
    setEmailing(true);
    try {
      const result = await sendFinanceReportEmail({ mode: 'send_now', period });
      notify.success(`Report emailed to ${result.emailed ?? user.email}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not send report email.');
    } finally {
      setEmailing(false);
    }
  };

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
            Reports
          </AppText>
          <AppText muted variant="caption">
            Daily, weekly, monthly, or yearly · emailed to your account email
          </AppText>
        </View>

        <View style={styles.content}>
          <View style={styles.periodRow}>
            {REPORT_PERIOD_OPTIONS.map((option) => {
              const selected = period === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPeriod(option.value)}
                  style={[
                    styles.periodChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? '#FFFFFF' : colors.textPrimary,
                      fontWeight: '700',
                      fontSize: 13,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <AppText muted variant="caption" style={styles.periodLabel}>
            {range.label}
          </AppText>

          <Button loading={emailing} onPress={() => void emailReport()} title="Email this report" />

          <HeroBalanceCard
            amount={balance}
            hint="Running balance from income and expenses (not budget-only spend)."
            label="Current Balance"
          />

          <View style={styles.statsGrid}>
            <StatCard amount={income} icon="arrow-up-circle-outline" label="Income" tone="income" />
            <StatCard amount={expenses} icon="arrow-down-circle-outline" label="Expenses" tone="expense" />
            <StatCard amount={net} icon="pulse-outline" label="Net" showSign tone={net >= 0 ? 'income' : 'expense'} />
            <StatCard
              amount={budgetSpend}
              hint="From budget plans"
              icon="pie-chart-outline"
              label="Budget spend"
              tone="primary"
            />
          </View>

          <SectionHeader
            subtitle={
              period === 'yearly'
                ? 'Income vs expenses by month'
                : 'Income compared to expenses in this period'
            }
            title="Cash flow"
          />
          <Card>
            {trend.some((point) => point.income > 0 || point.expense > 0) ? (
              <TrendBarChart points={trend} />
            ) : (
              <EmptyState
                icon="bar-chart-outline"
                message="No income or expenses in this period."
                title="No activity yet"
              />
            )}
          </Card>

          <SectionHeader subtitle={range.label} title="Spending by category" />
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

          <SectionHeader
            subtitle="Plan left after spend (budget track + expenses assigned to budgets)"
            title="Budget progress"
          />
          <Card>
            <BudgetProgressBars budgets={budgetStats.map((b) => ({
              id: b.id,
              name: b.name,
              total_amount: b.total,
              spent: b.spent,
            }))} />
          </Card>

          <SectionHeader subtitle="Tracked separately from Current Balance" title="Loans overview" />
          <View style={styles.statsGrid}>
            <StatCard amount={loanTotals.debts} hint="Outstanding debt" icon="alert-circle-outline" label="You owe" tone="expense" />
            <StatCard amount={loanTotals.receivables} hint="Expected back" icon="cash-outline" label="Owed to you" tone="income" />
            <StatCard icon="receipt-outline" label="All transactions" tone="primary" value={String(data?.txCount ?? 0)} />
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
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 4 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  periodLabel: { marginBottom: 8 },
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
