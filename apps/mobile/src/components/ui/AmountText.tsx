import { formatCurrency } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { mobileTypography } from '@/theme/fonts';
import { StyleSheet, Text, type TextStyle } from 'react-native';

interface AmountTextProps {
  amount: number;
  size?: 'large' | 'medium' | 'small';
  showSign?: boolean;
  color?: string;
  style?: TextStyle;
}

export function AmountText({
  amount,
  size = 'large',
  showSign = false,
  color,
  style,
}: AmountTextProps) {
  const { colors } = useTheme();
  const resolvedColor =
    color ??
    (showSign && amount > 0
      ? colors.income
      : showSign && amount < 0
        ? colors.expense
        : colors.textPrimary);

  const sizeStyles = {
    large: mobileTypography.amount,
    medium: { ...mobileTypography.amount, fontSize: 22, lineHeight: 28 },
    small: mobileTypography.amountSmall,
  };

  return (
    <Text
      style={[
        sizeStyles[size],
        styles.tabular,
        { color: resolvedColor },
        style,
      ]}
    >
      {formatCurrency(amount, { showSign })}
    </Text>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});
