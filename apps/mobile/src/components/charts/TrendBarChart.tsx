import { View, StyleSheet } from 'react-native';
import type { DailyTrendPoint } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from '@/components/ui';

type TrendBarChartProps = {
  points: DailyTrendPoint[];
};

export function TrendBarChart({ points }: TrendBarChartProps) {
  const { colors } = useTheme();
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.income, point.expense]));

  return (
    <View style={styles.root}>
      <View style={styles.chartRow}>
        {points.map((point) => {
          const incomeHeight = Math.round((point.income / maxValue) * 100);
          const expenseHeight = Math.round((point.expense / maxValue) * 100);
          return (
            <View key={point.date} style={styles.column}>
              <View style={styles.bars}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(incomeHeight, point.income > 0 ? 4 : 0)}%`,
                      backgroundColor: colors.income,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(expenseHeight, point.expense > 0 ? 4 : 0)}%`,
                      backgroundColor: colors.expense,
                    },
                  ]}
                />
              </View>
              <AppText muted variant="caption" style={styles.label}>
                {point.label.replace(/^\w+ /, '')}
              </AppText>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <AppText muted variant="caption">
            Income
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <AppText muted variant="caption">
            Expenses
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 128 },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: 112, width: '100%' },
  bar: { width: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 0 },
  label: { fontSize: 10, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
