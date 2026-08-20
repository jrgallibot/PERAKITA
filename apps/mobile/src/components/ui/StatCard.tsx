import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';
import { AmountText } from './AmountText';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  amount?: number;
  value?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'income' | 'expense' | 'primary';
  showSign?: boolean;
  style?: ViewStyle;
}

export function StatCard({
  label,
  amount,
  value,
  hint,
  icon,
  tone = 'default',
  showSign = false,
  style,
}: StatCardProps) {
  const { colors } = useTheme();

  const toneColor =
    tone === 'income'
      ? colors.income
      : tone === 'expense'
        ? colors.expense
        : tone === 'primary'
          ? colors.primary
          : colors.textPrimary;

  const chipBg =
    tone === 'income'
      ? '#D1FAE5'
      : tone === 'expense'
        ? '#FEE2E2'
        : tone === 'primary'
          ? colors.primaryMuted
          : colors.inputBackground;

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.top}>
        {icon ? (
          <View style={[styles.iconChip, { backgroundColor: chipBg }]}>
            <Ionicons color={toneColor} name={icon} size={16} />
          </View>
        ) : null}
        <AppText muted variant="label" style={styles.label}>
          {label}
        </AppText>
      </View>
      {amount !== undefined ? (
        <AmountText
          amount={amount}
          color={tone === 'default' ? undefined : toneColor}
          showSign={showSign}
          size="small"
        />
      ) : (
        <AppText variant="title" style={{ color: toneColor }}>
          {value}
        </AppText>
      )}
      {hint ? (
        <AppText muted variant="caption" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, minWidth: '47%', padding: 14, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
  hint: { marginTop: 2 },
});
