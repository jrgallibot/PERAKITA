import { useTheme } from '@/providers/ThemeProvider';
import { mobileTypography, type MobileTextVariant } from '@/theme/fonts';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

type TextVariant = MobileTextVariant | 'amount' | 'amountSmall';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
}

export function AppText({
  variant = 'body',
  muted = false,
  color,
  style,
  ...props
}: AppTextProps) {
  const { colors } = useTheme();
  const variantStyle = (mobileTypography[variant] ?? mobileTypography.body) as TextStyle;

  return (
    <Text
      style={[
        variantStyle,
        {
          color: color ?? (muted ? colors.textSecondary : colors.textPrimary),
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({});
