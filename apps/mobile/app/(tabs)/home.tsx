import { useCallback } from 'react';
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
import { formatCurrency, getDueTodayLoanAlerts } from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { useTheme } from '@/providers/ThemeProvider';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import { loanRepository } from '@/database/repositories/loanRepository';
import { getProfile } from '@/services/settingsService';
import { syncNow } from '@/services/syncService';
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

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [balance, totals, profile, transactions, spending, loans] = await Promise.all([
        transactionRepository.getIncomeExpenseBalance(user!.id),
        transactionRepository.getMonthlyTotals(user!.id, month.start, month.end),
        getProfile(user!.id),
        transactionRepository.findAll(user!.id, 5),
        transactionRepository.getSpendingBreakdown(user!.id, month.start, month.end),
        loanRepository.findAll(user!.id),
      ]);
      return { balance, totals, profile, transactions, spending, loans };
    },
  });

  const balance = data?.balance ?? 0;
  const income = data?.totals.income ?? 0;
  const expenses = data?.totals.expenses ?? 0;
  const transactions = data?.transactions ?? [];
  const spending = data?.spending ?? [];
  const dueToday = getDueTodayLoanAlerts(data?.loans ?? []);

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
                {getGreeting()} · {month.label}
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
            amount={balance}
            badge="Live"
            hint="Income minus expenses only. Loan debts stay on Loans."
            label="Current balance"
          />

          <DueTodayBanner alerts={dueToday} />

          <View style={styles.statsRow}>
            <StatCard amount={income} icon="trending-up-outline" label="Income" tone="income" />
            <StatCard amount={expenses} icon="trending-down-outline" label="Expenses" tone="expense" />
            <StatCard
              amount={income - expenses}
              icon="analytics-outline"
              label="Net"
              showSign
              tone={income - expenses >= 0 ? 'income' : 'expense'}
            />
          </View>

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
                label: 'Loan',
                icon: 'people-outline',
                tone: 'loan',
                onPress: () => router.push('/add-loan' as never),
              },
              {
                label: 'Budget',
                icon: 'pie-chart-outline',
                tone: 'budget',
                onPress: () => router.push('/add-budget' as never),
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
                actionLabel="Add expense"
                icon="wallet-outline"
                message="Your recent activity will show up here."
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
  content: { paddingHorizontal: 20, paddingTop: 16 },
  contentTablet: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
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
