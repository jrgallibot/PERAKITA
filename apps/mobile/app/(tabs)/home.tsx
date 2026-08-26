import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, getDueTodayLoanAlerts, buildPesoNotificationAlerts } from '@perakita/shared';
import { profileToNotificationPrefs } from '@/services/settingsService';
import { budgetRepository } from '@/database/repositories/budgetRepository';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { useTheme } from '@/providers/ThemeProvider';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import { loanRepository } from '@/database/repositories/loanRepository';
import { getProfile } from '@/services/settingsService';
import { syncNow } from '@/services/syncService';
import { loadPesoDashboard } from '@/services/pesoEngineService';
import { loadGoalsDashboard } from '@/services/savingsGoalService';
import {
  Screen,
  Card,
  AppText,
  Badge,
  IconButton,
  EmptyState,
  BrandLogo,
  HeroBalanceCard,
  StatCard,
  QuickActionGrid,
  SectionHeader,
  TransactionRow,
} from '@/components/ui';
import {
  SafeToSpendCard,
  ForecastWarningBanner,
  HealthScoreRing,
  UpcomingBillsList,
  SpendingRiskAlert,
  AiInsightCard,
  NotificationAlertsList,
  SavingsGoalsDashboardSection,
} from '@/components/peso';
import { DueTodayBanner } from '@/components/DueTodayBanner';
import { SpendingDonut } from '@/components/charts/SpendingDonut';
import { signedTransactionAmount } from '@/lib/transactionLabels';
import { getWebAppLink } from '@/lib/webApp';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

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

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const syncStatus = useNetworkStore((s) => s.syncStatus);
  const pendingCount = useNetworkStore((s) => s.pendingCount);
  const isTablet = width >= 768;
  const month = monthRange();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const openAssistant = (question?: string) => {
    if (question) {
      router.push({ pathname: '/ai-assistant', params: { q: question } } as never);
      return;
    }
    router.push('/ai-assistant' as never);
  };

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['peso-dashboard', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [peso, profile, transactions, spending, loans, budgets, goalsData] = await Promise.all([
        loadPesoDashboard(user!.id),
        getProfile(user!.id),
        transactionRepository.findAll(user!.id, 5),
        transactionRepository.getSpendingBreakdown(user!.id, month.start, month.end),
        loanRepository.findAll(user!.id),
        budgetRepository.findAllWithProgress(user!.id),
        loadGoalsDashboard(user!.id),
      ]);
      return { peso, profile, transactions, spending, loans, budgets, goalsData };
    },
  });

  const peso = data?.peso;
  const transactions = data?.transactions ?? [];
  const spending = data?.spending ?? [];
  const dueToday = getDueTodayLoanAlerts(data?.loans ?? []);
  const notificationAlerts = useMemo(() => {
    if (!peso || !data?.profile) return [];
    const prefs = profileToNotificationPrefs(data.profile);
    const budgetRows = (data.budgets ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      percent: b.percent,
    }));
    const goalRows = (data.goalsData?.enriched ?? [])
      .filter((item) => !item.goal.is_archived)
      .map((item) => ({
        id: item.goal.id,
        name: item.goal.name,
        status: item.status,
        progressPercentage: item.calculations.progressPercentage,
        remainingAmount: item.calculations.remainingAmount,
        targetDate: item.goal.target_date,
        daysRemaining: item.calculations.daysRemaining,
        requiredDaily: item.calculations.requiredDailySavings,
      }));
    return buildPesoNotificationAlerts(peso, prefs, budgetRows, goalRows).filter(
      (alert) => !dismissedAlerts.includes(alert.id),
    );
  }, [peso, data?.profile, data?.budgets, data?.goalsData, dismissedAlerts]);

  const syncLabel = !isConnected
    ? 'Offline Mode'
    : syncStatus === 'syncing'
      ? 'Syncing...'
      : pendingCount > 0
        ? `${pendingCount} pending`
        : 'Synced';

  const syncVariant = !isConnected
    ? 'offline'
    : syncStatus === 'syncing'
      ? 'syncing'
      : pendingCount > 0
        ? 'warning'
        : 'success';

  const name = data?.profile?.display_name ?? user?.email?.split('@')[0] ?? 'there';

  const onRefresh = useCallback(async () => {
    if (user?.id && isConnected) {
      await syncNow(user.id);
    }
    await refetch();
  }, [refetch, user?.id, isConnected]);

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.identity}>
              <BrandLogo showLabel size={40} />
              <AppText muted variant="caption">
                {getGreeting()} · Know where your money goes
              </AppText>
              <AppText variant="display" style={styles.name}>
                {name}
              </AppText>
            </View>
            <IconButton
              accessibilityLabel="Settings"
              name="settings-outline"
              onPress={() => router.push('/settings')}
            />
          </View>
          <Badge label={syncLabel} variant={syncVariant} />
        </View>

        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <HeroBalanceCard
            amount={peso?.currentBalance ?? 0}
            badge="Live"
            hint="Income minus expenses. Loan debts tracked separately."
            label="Current balance"
          />

          {peso ? (
            <SafeToSpendCard
              daysUntilPayday={peso.daysUntilPayday}
              realAvailable={peso.realAvailable}
              safeToSpendToday={peso.safeToSpendToday}
            />
          ) : null}

          <NotificationAlertsList
            alerts={notificationAlerts}
            onDismiss={(id) => setDismissedAlerts((prev) => [...prev, id])}
          />

          <SpendingRiskAlert
            onFixPress={() => openAssistant('Why is my balance going down quickly?')}
            risk={peso?.spendingRisk ?? { detected: false, severity: 'none', message: null }}
          />

          {peso?.forecast.warning ? (
            <ForecastWarningBanner
              message={peso.forecast.warning}
              onFixPress={() => openAssistant('Why is my balance going down quickly?')}
            />
          ) : null}

          <DueTodayBanner alerts={dueToday} />

          <View style={styles.statsRow}>
            <StatCard
              amount={peso?.monthlyIncome ?? 0}
              icon="trending-up-outline"
              label="Income"
              tone="income"
            />
            <StatCard
              amount={peso?.monthlyExpenses ?? 0}
              icon="trending-down-outline"
              label="Expenses"
              tone="expense"
            />
            <StatCard
              icon="calendar-outline"
              label="Days to payday"
              value={String(peso?.daysUntilPayday ?? 0)}
            />
          </View>

          {peso ? <HealthScoreRing health={peso.healthScore} /> : null}

          {user?.id ? <AiInsightCard userId={user.id} /> : null}

          {data?.goalsData ? (
            <SavingsGoalsDashboardSection
              summary={data.goalsData.summary}
              topGoals={data.goalsData.enriched.filter((g) => !g.goal.is_completed && !g.goal.is_archived)}
            />
          ) : null}

          {peso ? <UpcomingBillsList bills={peso.upcomingBills} /> : null}

          <SectionHeader eyebrow="Actions" subtitle="Record money in seconds" title="Quick actions" />
          <QuickActionGrid
            actions={[
              {
                label: 'Expense',
                icon: 'remove-circle-outline',
                tone: 'expense',
                onPress: () => router.push('/add-transaction?type=expense' as never),
              },
              {
                label: 'Income',
                icon: 'add-circle-outline',
                tone: 'income',
                onPress: () => router.push('/add-transaction?type=income' as never),
              },
              {
                label: 'Goal',
                icon: 'flag-outline',
                tone: 'budget',
                onPress: () => router.push('/add-goal' as never),
              },
              {
                label: 'AI Help',
                icon: 'chatbubble-ellipses-outline',
                tone: 'loan',
                onPress: openAssistant,
              },
            ]}
          />

          <SectionHeader
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/transactions')}
            subtitle="Latest activity across accounts"
            title="Recent transactions"
          />
          <Card compact>
            {transactions.length === 0 ? (
              <EmptyState
                actionLabel="Add your first transaction"
                icon="wallet-outline"
                message="Your financial journey starts here."
                onAction={() => router.push('/add-transaction?type=expense' as never)}
                title="No transactions yet"
              />
            ) : (
              transactions.map((tx, i) => (
                <TransactionRow
                  key={tx.id}
                  amount={signedTransactionAmount(tx.type, tx.amount)}
                  icon={(tx.category_icon as 'wallet-outline') ?? 'wallet-outline'}
                  iconColor={tx.category_color ?? colors.primary}
                  showDivider={i < transactions.length - 1}
                  subtitle={tx.category_name ?? 'Uncategorized'}
                  title={tx.description || tx.category_name || tx.type}
                />
              ))
            )}
          </Card>

          <SectionHeader
            actionLabel="Open web"
            onAction={() => void Linking.openURL(getWebAppLink('/dashboard'))}
            subtitle="Where your money went this month"
            title="Spending breakdown"
          />
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
                          {item.percent}% of monthly spend
                        </AppText>
                      </View>
                      <AppText variant="subtitle">{formatCurrency(item.total)}</AppText>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>
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
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  identity: { flex: 1, gap: 8, paddingRight: 8 },
  name: { fontSize: 26, lineHeight: 32 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  contentTablet: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chartCard: { alignItems: 'center' },
  legend: { width: '100%', gap: 0, marginTop: 8 },
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
