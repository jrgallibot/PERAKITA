import { View, StyleSheet } from 'react-native';
import { formatCurrency } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText, AmountText } from '@/components/ui';

interface SafeToSpendCardProps {
  realAvailable: number;
  safeToSpendToday: number;
  daysUntilPayday: number;
}

export function SafeToSpendCard({
  realAvailable,
  safeToSpendToday,
  daysUntilPayday,
}: SafeToSpendCardProps) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.block}>
          <AppText muted variant="caption">
            REAL AVAILABLE
          </AppText>
          <AmountText amount={realAvailable} size="medium" />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.block}>
          <AppText muted variant="caption">
            SAFE TO SPEND TODAY
          </AppText>
          <AmountText amount={safeToSpendToday} size="medium" color={colors.income} />
        </View>
      </View>
      <AppText muted variant="caption" style={styles.hint}>
        {daysUntilPayday} day{daysUntilPayday === 1 ? '' : 's'} until next income
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  block: { flex: 1, gap: 4 },
  divider: { width: 1, height: 48, marginHorizontal: 12 },
  hint: { marginTop: 4 },
});
