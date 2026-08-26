import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { loadGoalsDashboard } from '@/services/savingsGoalService';
import { Screen, AppText, Button, EmptyState, Card, SectionHeader } from '@/components/ui';
import { GoalCard } from '@/components/peso/GoalCard';

export default function GoalsScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['goals', user?.id],
    enabled: !!user?.id,
    queryFn: () => loadGoalsDashboard(user!.id),
  });

  const summary = data?.summary;
  const enriched = data?.enriched ?? [];
  const activeGoals = enriched.filter((g) => !g.goal.is_completed && !g.goal.is_archived);
  const completedGoals = enriched.filter((g) => g.goal.is_completed);

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        <View style={styles.header}>
          <AppText variant="display">My Savings Goals</AppText>
          <AppText muted>Track progress toward what matters to you</AppText>
        </View>

        {summary ? (
          <Card style={[styles.summaryCard, { borderColor: colors.primaryMuted }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <AppText muted variant="caption">
                  Total saved
                </AppText>
                <AppText variant="title">{formatCurrency(summary.totalSaved)}</AppText>
              </View>
              <View style={styles.summaryStat}>
                <AppText muted variant="caption">
                  Total targets
                </AppText>
                <AppText variant="title">{formatCurrency(summary.totalTargets)}</AppText>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <AppText muted variant="caption">
                  Overall progress
                </AppText>
                <AppText variant="title">{summary.overallProgress.toFixed(1)}%</AppText>
              </View>
              <View style={styles.summaryStat}>
                <AppText muted variant="caption">
                  Active goals
                </AppText>
                <AppText variant="title">{summary.activeGoals}</AppText>
              </View>
            </View>
            <View style={[styles.bar, { backgroundColor: colors.inputBackground }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(100, summary.overallProgress)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </Card>
        ) : null}

        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <EmptyState
            actionLabel="+ Create Goal"
            icon="flag-outline"
            message="Create a savings goal and let PESO help you reach it."
            onAction={() => router.push('/add-goal' as never)}
            title="🎯 What are you saving for?"
          />
        ) : (
          <>
            <SectionHeader
              actionLabel="Add goal"
              onAction={() => router.push('/add-goal' as never)}
              title="Active goals"
            />
            {activeGoals.map((item) => (
              <GoalCard
                key={item.goal.id}
                enriched={item}
                onPress={() => router.push(`/goal/${item.goal.id}` as never)}
              />
            ))}

            {completedGoals.length > 0 ? (
              <>
                <SectionHeader title="Completed" />
                {completedGoals.map((item) => (
                  <GoalCard
                    key={item.goal.id}
                    enriched={item}
                    onPress={() => router.push(`/goal/${item.goal.id}` as never)}
                  />
                ))}
              </>
            ) : null}
          </>
        )}

        <Button title="+ Create Goal" onPress={() => router.push('/add-goal' as never)} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { gap: 4, marginBottom: 4 },
  summaryCard: { gap: 12, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryStat: { flex: 1, gap: 4 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});
