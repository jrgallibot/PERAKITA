import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { formatCurrency, type DueTodayAlerts } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText, Badge, Card } from '@/components/ui';

type Props = {
  alerts: DueTodayAlerts;
  /** When set, tapping a row opens payment for that loan. */
  enableLoanLinks?: boolean;
};

export function DueTodayBanner({ alerts, enableLoanLinks = true }: Props) {
  const { colors, isDark } = useTheme();
  if (alerts.items.length === 0) return null;

  const hasUrgent = alerts.items.some((item) => item.reason === 'overdue' || item.reason === 'maturity');
  const tint = hasUrgent ? colors.expense : colors.warning;
  const bg = isDark
    ? hasUrgent
      ? '#3F1212'
      : '#3B2A0A'
    : hasUrgent
      ? '#FEF2F2'
      : '#FFFBEB';

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: `${tint}44`,
          borderLeftColor: tint,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" style={{ color: tint, fontWeight: '700', letterSpacing: 0.5 }}>
            DUE TODAY
          </AppText>
          <AppText>
            {alerts.items.length === 1
              ? '1 loan needs attention'
              : `${alerts.items.length} loans need attention`}
          </AppText>
        </View>
        <Badge
          label={hasUrgent ? 'Urgent' : 'Kinsena'}
          variant={hasUrgent ? 'danger' : 'warning'}
        />
      </View>

      {alerts.items.slice(0, 4).map((item) => {
        const isDebt = item.loan_type === 'debt';
        const content = (
          <View style={[styles.row, { borderTopColor: `${tint}22` }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText>{item.person_name}</AppText>
              <AppText muted variant="caption">
                {item.label}
                {isDebt ? ' · you owe' : ' · owed to you'}
              </AppText>
            </View>
            <AppText style={{ color: isDebt ? colors.expense : colors.income, fontWeight: '700' }}>
              {formatCurrency(item.remaining_amount)}
            </AppText>
          </View>
        );

        if (!enableLoanLinks) {
          return <View key={item.id}>{content}</View>;
        }

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/add-loan-payment',
                params: { loanId: item.id },
              } as never)
            }
          >
            {content}
          </Pressable>
        );
      })}

      {alerts.items.length > 4 ? (
        <Pressable onPress={() => router.push('/(tabs)/loans' as never)}>
          <AppText muted variant="caption" style={styles.more}>
            +{alerts.items.length - 4} more on Loans
          </AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 4,
    borderLeftWidth: 4,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  headerText: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  more: { marginTop: 8, textAlign: 'center' },
});
