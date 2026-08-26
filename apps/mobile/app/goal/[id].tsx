import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  GOAL_MILESTONE_PERCENTAGES,
  analyzeGoalFeasibility,
  computeContributionStats,
  computeGoalCalculations,
  computeSavingsAllocation,
  formatCurrency,
  formatGoalStatusEmoji,
  goalFeasibilityLabel,
  goalStatusLabel,
} from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { loadGoalDetail } from '@/services/savingsGoalService';
import { loadPesoDashboard } from '@/services/pesoEngineService';
import { savingsGoalRepository } from '@/database/repositories/savingsGoalRepository';
import { notify } from '@/stores/toastStore';
import { Screen, AppText, Button, IconButton, Card, SectionHeader, Badge } from '@/components/ui';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [showAnalysis, setShowAnalysis] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['goal', user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const [detail, snapshot] = await Promise.all([
        loadGoalDetail(user!.id, id!),
        loadPesoDashboard(user!.id),
      ]);
      return { detail, snapshot };
    },
  });

  if (!data?.detail) {
    return (
      <Screen>
        <IconButton accessibilityLabel="Back" name="arrow-back" onPress={() => router.back()} />
        <AppText muted>Loading goal…</AppText>
      </Screen>
    );
  }

  const { enriched, contributions, milestones, allGoals, contributionsByGoal } = data.detail;
  const { goal, calculations, status, forecast } = enriched;
  const stats = computeContributionStats(contributions);
  const pct = Math.round(calculations.progressPercentage);

  const otherMonthlyRequired = allGoals
    .filter((g) => g.id !== goal.id && !g.is_completed)
    .reduce((sum, g) => sum + computeGoalCalculations(g).requiredMonthlySavings, 0);

  const analysis = data.snapshot
    ? analyzeGoalFeasibility(goal, data.snapshot, otherMonthlyRequired)
    : null;

  const allocation = data.snapshot
    ? computeSavingsAllocation(
        allGoals.filter((g) => !g.is_completed),
        Math.max(0, analysis?.monthlyAvailable ?? 0),
        contributionsByGoal,
      )
    : [];

  const onDelete = () => {
    Alert.alert('Delete goal?', 'This will remove the goal and its contribution history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !id) return;
          await savingsGoalRepository.softDelete(user.id, id);
          await queryClient.invalidateQueries({ queryKey: ['goals'] });
          notify.success('Goal deleted');
          router.back();
        },
      },
    ]);
  };

  const onArchive = async () => {
    if (!user?.id || !id) return;
    await savingsGoalRepository.update(user.id, id, { is_archived: true });
    await queryClient.invalidateQueries({ queryKey: ['goals'] });
    notify.success('Goal archived');
    router.back();
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <IconButton accessibilityLabel="Back" name="arrow-back" onPress={() => router.back()} />
        <AppText variant="title">Savings Goal</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons color={colors.primary} name={goal.icon as keyof typeof Ionicons.glyphMap} size={32} />
          </View>
          <AppText muted variant="caption">
            {goal.is_completed ? '🎉 GOAL COMPLETED' : goal.name.toUpperCase()}
          </AppText>
          <AppText variant="display">{formatCurrency(goal.current_amount)}</AppText>
          <AppText muted>
            of {formatCurrency(goal.target_amount)} · {pct}%
          </AppText>
          <View style={[styles.bar, { backgroundColor: colors.inputBackground }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: goal.is_completed ? colors.income : colors.primary,
                },
              ]}
            />
          </View>
          <AppText variant="subtitle">{formatCurrency(calculations.remainingAmount)} remaining</AppText>
          <Badge
            label={`${formatGoalStatusEmoji(status)} ${goalStatusLabel(status)}`}
            variant={status === 'at_risk' ? 'danger' : status === 'behind' ? 'warning' : 'success'}
          />
        </View>

        <Card style={styles.section}>
          <SectionHeader title="Target date" />
          {goal.target_date ? (
            <>
              <AppText variant="subtitle">
                {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString('en-PH', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </AppText>
              <AppText muted variant="caption">
                {calculations.daysRemaining ?? 0} days remaining
              </AppText>
            </>
          ) : (
            <AppText muted>No target date set</AppText>
          )}
        </Card>

        <Card style={styles.section}>
          <SectionHeader title="Required savings" />
          <View style={styles.statGrid}>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Daily
              </AppText>
              <AppText variant="subtitle">{formatCurrency(Math.ceil(calculations.requiredDailySavings))}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Weekly
              </AppText>
              <AppText variant="subtitle">{formatCurrency(calculations.requiredWeeklySavings)}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Monthly
              </AppText>
              <AppText variant="subtitle">{formatCurrency(calculations.requiredMonthlySavings)}</AppText>
            </View>
          </View>
          {forecast.currentDailySavingsRate != null ? (
            <AppText muted variant="caption" style={{ marginTop: 8 }}>
              Your average: {formatCurrency(Math.ceil(forecast.currentDailySavingsRate))}/day
            </AppText>
          ) : null}
        </Card>

        <Card style={styles.section}>
          <SectionHeader title="Milestones" />
          <View style={styles.milestones}>
            {GOAL_MILESTONE_PERCENTAGES.map((m) => {
              const reached = milestones.some((x) => x.percentage === m && !x.deleted_at);
              return (
                <View key={m} style={styles.milestone}>
                  <AppText variant="subtitle">{m}%</AppText>
                  <AppText>{reached ? '✅' : '🔒'}</AppText>
                </View>
              );
            })}
          </View>
        </Card>

        {forecast.forecastMessage ? (
          <Card style={[styles.section, { borderColor: colors.warning }]}>
            <SectionHeader title="Forecast" />
            <AppText muted variant="caption">{forecast.forecastMessage}</AppText>
            {forecast.projectedCompletionDate ? (
              <AppText variant="subtitle" style={{ marginTop: 8 }}>
                Projected completion:{' '}
                {new Date(`${forecast.projectedCompletionDate}T00:00:00`).toLocaleDateString('en-PH', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </AppText>
            ) : null}
          </Card>
        ) : null}

        <Card style={styles.section}>
          <SectionHeader
            actionLabel="Analyze"
            onAction={() => setShowAnalysis((v) => !v)}
            title="Goal analysis"
          />
          {showAnalysis && analysis ? (
            <View style={{ gap: 8 }}>
              <Badge
                label={`${analysis.feasibility === 'achievable' ? '🟢' : analysis.feasibility === 'difficult' ? '🟡' : '🔴'} ${goalFeasibilityLabel(analysis.feasibility)}`}
                variant={analysis.feasibility === 'at_risk' ? 'danger' : analysis.feasibility === 'difficult' ? 'warning' : 'success'}
              />
              <AppText muted variant="caption">{analysis.message}</AppText>
            </View>
          ) : (
            <AppText muted variant="caption">
              Tap Analyze to see if this goal fits your current finances.
            </AppText>
          )}
        </Card>

        {allocation.length > 1 ? (
          <Card style={styles.section}>
            <SectionHeader title="Recommended allocation" />
            <AppText muted variant="caption" style={{ marginBottom: 8 }}>
              Based on ~{formatCurrency(analysis?.monthlyAvailable ?? 0)}/month available for savings
            </AppText>
            {allocation.map((item) => (
              <View key={item.goalId} style={styles.allocationRow}>
                <AppText style={{ flex: 1 }}>{item.goalName}</AppText>
                <AppText variant="subtitle">{formatCurrency(item.recommendedAmount)}</AppText>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.section}>
          <SectionHeader title="Savings history" />
          <View style={styles.statGrid}>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                This month
              </AppText>
              <AppText variant="subtitle">{formatCurrency(stats.totalThisMonth)}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Average
              </AppText>
              <AppText variant="subtitle">{formatCurrency(stats.averageContribution)}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Largest
              </AppText>
              <AppText variant="subtitle">{formatCurrency(stats.largestContribution)}</AppText>
            </View>
          </View>
          <AppText muted variant="caption" style={{ marginBottom: 8 }}>
            {stats.frequencyLabel}
          </AppText>
          {contributions.length === 0 ? (
            <AppText muted>No contributions yet</AppText>
          ) : (
            contributions.map((c) => (
              <View key={c.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle">
                    {new Date(`${c.contribution_date}T00:00:00`).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </AppText>
                  <AppText muted variant="caption">
                    {c.source ?? c.notes ?? 'Savings'}
                  </AppText>
                </View>
                <AppText variant="subtitle" style={{ color: colors.income }}>
                  +{formatCurrency(c.amount)}
                </AppText>
              </View>
            ))
          )}
        </Card>

        <View style={styles.actions}>
          {!goal.is_completed ? (
            <Button
              title="+ Add Savings"
              onPress={() => router.push(`/add-contribution?goalId=${goal.id}` as never)}
            />
          ) : null}
          {goal.is_completed ? (
            <Button title="Archive goal" variant="secondary" onPress={() => void onArchive()} />
          ) : null}
          <Button title="Delete goal" variant="secondary" onPress={onDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 8 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', marginVertical: 8 },
  barFill: { height: '100%', borderRadius: 6 },
  section: { gap: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { minWidth: 90, gap: 4 },
  milestones: { flexDirection: 'row', justifyContent: 'space-between' },
  milestone: { alignItems: 'center', gap: 4 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  allocationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  actions: { gap: 10 },
});
