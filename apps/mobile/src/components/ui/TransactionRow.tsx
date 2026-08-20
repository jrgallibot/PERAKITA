import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';
import { AmountText } from './AmountText';

interface TransactionRowProps {
  title: string;
  subtitle: string;
  amount: number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  showDivider?: boolean;
}

export function TransactionRow({
  title,
  subtitle,
  amount,
  icon = 'wallet-outline',
  iconColor,
  showDivider = false,
}: TransactionRowProps) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor ?? colors.primary;

  return (
    <View
      style={[
        styles.row,
        showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${resolvedIconColor}18` }]}>
        <Ionicons color={resolvedIconColor} name={icon} size={20} />
      </View>
      <View style={styles.body}>
        <AppText numberOfLines={1} variant="subtitle">
          {title}
        </AppText>
        <AppText muted numberOfLines={1} variant="caption">
          {subtitle}
        </AppText>
      </View>
      <AmountText amount={amount} showSign size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2, paddingRight: 8 },
});
