import { View, StyleSheet } from 'react-native';
import type { UpcomingBill } from '@perakita/shared';
import { formatCurrency } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText } from '@/components/ui';

interface UpcomingBillsListProps {
  bills: UpcomingBill[];
}

export function UpcomingBillsList({ bills }: UpcomingBillsListProps) {
  const { colors } = useTheme();
  if (bills.length === 0) return null;

  return (
    <Card compact>
      <AppText variant="subtitle" style={{ marginBottom: 8 }}>
        Upcoming bills
      </AppText>
      {bills.slice(0, 5).map((bill, i) => (
        <View
          key={bill.id}
          style={[
            styles.row,
            i < Math.min(bills.length, 5) - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle">{bill.name}</AppText>
            <AppText muted variant="caption">
              Due {bill.due_date}
            </AppText>
          </View>
          <AppText variant="subtitle">{formatCurrency(bill.amount)}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
});
