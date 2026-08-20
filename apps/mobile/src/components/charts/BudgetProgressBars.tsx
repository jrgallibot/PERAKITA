import { View, StyleSheet } from 'react-native';
import { buildBudgetStats, formatCurrency, type BudgetStat } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from '@/components/ui';

type BudgetProgressBarsProps = {
  budgets: Array<{ id: string; name: string; total_amount: number; spent: number }>;
};

export function BudgetProgressBars({ budgets }: BudgetProgressBarsProps) {
  const { colors } = useTheme();
  const stats: BudgetStat[] = buildBudgetStats(budgets);

  if (stats.length === 0) {
    return <AppText muted>No budgets yet. Create one from the Budgets tab.</AppText>;
  }

  return (
    <View style={styles.root}>
      {stats.map((budget) => {
        const over = budget.spent > budget.total;
        const barColor = over ? colors.expense : budget.percent >= 80 ? '#F59E0B' : colors.primary;
        return (
          <View key={budget.id} style={styles.row}>
            <View style={styles.header}>
              <AppText style={styles.name}>{budget.name}</AppText>
              <AppText muted variant="caption">
                {formatCurrency(budget.spent)} / {formatCurrency(budget.total)}
              </AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, budget.percent)}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <AppText muted variant="caption">
              {budget.percent}% used
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  row: { gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontWeight: '600' },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
