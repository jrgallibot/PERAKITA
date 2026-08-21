import { StyleSheet, View } from 'react-native';
import { formatCurrency, type BudgetSpendSummary } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Badge, Card } from '@/components/ui';

export function BudgetSpendFlow({
  entries,
  emptyLabel = 'Nothing added to this budget yet.',
}: {
  entries: BudgetSpendSummary[];
  emptyLabel?: string;
}) {
  const { colors } = useTheme();

  if (entries.length === 0) {
    return <AppText muted>{emptyLabel}</AppText>;
  }

  return (
    <View>
      {entries.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.rail}>
            <View
              style={[
                styles.dot,
                { backgroundColor: item.overBudget ? colors.expense : colors.primary },
              ]}
            />
            {index < entries.length - 1 ? (
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            ) : null}
          </View>
          <Card style={styles.card}>
            <View style={styles.head}>
              <AppText variant="caption" muted>
                Added {item.step}
              </AppText>
              <Badge
                label={item.overBudget ? 'Over plan' : 'Added to budget'}
                variant={item.overBudget ? 'danger' : 'success'}
              />
            </View>
            <AppText style={[styles.amount, { color: colors.income }]}>
              {formatCurrency(item.amount, { showSign: true })}
            </AppText>
            <AppText muted variant="caption">
              {item.spendDate} · {item.category} · via {item.method}
            </AppText>
            {item.description && item.description !== item.category ? (
              <AppText muted variant="caption">
                {item.description}
              </AppText>
            ) : null}
            <AppText style={styles.runningTotal}>
              Full total {formatCurrency(item.planTotal + item.spentToDate, { showSign: true })}
            </AppText>
            <AppText muted variant="caption">
              plan {formatCurrency(item.planTotal)} + expenses{' '}
              {formatCurrency(item.spentToDate, { showSign: true })}
            </AppText>
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  rail: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 18 },
  line: { flex: 1, width: 2, marginVertical: 4 },
  card: { flex: 1, marginBottom: 10, padding: 12, gap: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontWeight: '700', fontSize: 22, lineHeight: 28 },
  runningTotal: { fontWeight: '800', fontSize: 18, lineHeight: 24, marginTop: 4 },
});
