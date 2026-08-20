import { StyleSheet, View } from 'react-native';
import { formatCurrency, type LoanPaymentSummary } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Badge, Card } from '@/components/ui';

export function LoanPaymentFlow({
  entries,
  emptyLabel = 'No payments recorded yet.',
}: {
  entries: LoanPaymentSummary[];
  emptyLabel?: string;
}) {
  const { colors } = useTheme();

  if (entries.length === 0) {
    return <AppText muted>{emptyLabel}</AppText>;
  }

  return (
    <View style={styles.list}>
      {entries.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: item.late ? colors.expense : colors.primary }]} />
            {index < entries.length - 1 ? (
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            ) : null}
          </View>
          <Card style={styles.card}>
            <View style={styles.head}>
              <AppText variant="caption" muted>
                Payment {item.step}
              </AppText>
              <Badge label={item.statusLabel} variant={item.late ? 'danger' : 'success'} />
            </View>
            <AppText style={styles.amount}>{formatCurrency(item.amount)}</AppText>
            <AppText muted variant="caption">
              {item.paymentDate} · via {item.method}
            </AppText>
            {item.periodLabel ? (
              <AppText muted variant="caption">
                {item.periodLabel}
                {item.dueDate ? ` · due ${item.dueDate}` : ''}
                {item.graceEnds ? ` · grace until ${item.graceEnds}` : ''}
              </AppText>
            ) : null}
            {item.late && item.penalty > 0 ? (
              <AppText muted variant="caption">
                Penalty {formatCurrency(item.penalty)}
              </AppText>
            ) : null}
            <AppText muted variant="caption">
              Paid to date {formatCurrency(item.paidToDate)} · remaining {formatCurrency(item.remainingAfter)}
            </AppText>
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', gap: 10 },
  rail: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 18 },
  line: { flex: 1, width: 2, marginVertical: 4 },
  card: { flex: 1, marginBottom: 10, padding: 12, gap: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontWeight: '700' },
});
