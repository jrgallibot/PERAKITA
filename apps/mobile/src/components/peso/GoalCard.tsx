import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EnrichedSavingsGoal } from '@perakita/shared';
import {
  formatCurrency,
  formatGoalStatusEmoji,
  goalStatusLabel,
} from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText, Badge } from '@/components/ui';

interface GoalCardProps {
  enriched: EnrichedSavingsGoal;
  onPress?: () => void;
}

function statusVariant(status: EnrichedSavingsGoal['status']) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'on_track':
      return 'success' as const;
    case 'behind':
      return 'warning' as const;
    case 'at_risk':
      return 'danger' as const;
  }
}

export function GoalCard({ enriched, onPress }: GoalCardProps) {
  const { colors } = useTheme();
  const { goal, calculations, status } = enriched;
  const pct = Math.round(calculations.progressPercentage);

  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress}>
      <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons color={colors.primary} name={goal.icon as keyof typeof Ionicons.glyphMap} size={22} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title">{goal.name}</AppText>
          <AppText muted variant="caption">
            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
          </AppText>
        </View>
        <Badge
          label={`${formatGoalStatusEmoji(status)} ${goalStatusLabel(status)}`}
          variant={statusVariant(status)}
        />
      </View>

      <AppText variant="subtitle">{pct}%</AppText>
      <View style={[styles.bar, { backgroundColor: colors.inputBackground }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(100, pct)}%`,
              backgroundColor: status === 'completed' ? colors.income : colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.meta}>
          <AppText muted variant="caption">
            Remaining
          </AppText>
          <AppText variant="subtitle">{formatCurrency(calculations.remainingAmount)}</AppText>
        </View>
        {goal.target_date ? (
          <View style={styles.meta}>
            <AppText muted variant="caption">
              Target
            </AppText>
            <AppText variant="subtitle">
              {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </AppText>
          </View>
        ) : null}
        {calculations.daysRemaining != null ? (
          <View style={styles.meta}>
            <AppText muted variant="caption">
              Days left
            </AppText>
            <AppText variant="subtitle">{calculations.daysRemaining}</AppText>
          </View>
        ) : null}
      </View>

      {calculations.requiredDailySavings > 0 && !goal.is_completed ? (
        <AppText muted variant="caption">
          Required: {formatCurrency(Math.ceil(calculations.requiredDailySavings))}/day ·{' '}
          {formatCurrency(calculations.requiredWeeklySavings)}/week
        </AppText>
      ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 4 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  meta: { gap: 2, minWidth: 90 },
});
