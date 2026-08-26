import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EnrichedSavingsGoal, GoalSummary } from '@perakita/shared';
import { formatCurrency } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText, SectionHeader } from '@/components/ui';

interface SavingsGoalsDashboardSectionProps {
  summary: GoalSummary;
  topGoals: EnrichedSavingsGoal[];
}

export function SavingsGoalsDashboardSection({
  summary,
  topGoals,
}: SavingsGoalsDashboardSectionProps) {
  const { colors } = useTheme();

  if (topGoals.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader
        actionLabel="View all goals"
        onAction={() => router.push('/(tabs)/goals')}
        subtitle={`${formatCurrency(summary.totalSaved)} saved · ${formatCurrency(summary.monthlyContributions)}/mo`}
        title="Savings goals"
      />
      <Card style={{ gap: 12 }}>
        {topGoals.slice(0, 3).map((item) => {
          const pct = Math.round(item.calculations.progressPercentage);
          return (
            <Pressable
              key={item.goal.id}
              onPress={() => router.push(`/goal/${item.goal.id}` as never)}
              style={styles.goalRow}
            >
              <View style={[styles.icon, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons
                  color={colors.primary}
                  name={item.goal.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                />
              </View>
              <View style={styles.flex}>
                <AppText variant="subtitle">{item.goal.name}</AppText>
                <AppText muted variant="caption">
                  {formatCurrency(item.goal.current_amount)} / {formatCurrency(item.goal.target_amount)}
                </AppText>
                <View style={[styles.bar, { backgroundColor: colors.inputBackground }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min(100, pct)}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
              <AppText variant="subtitle">{pct}%</AppText>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 4 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
