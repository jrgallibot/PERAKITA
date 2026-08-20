import { useTheme } from '@/providers/ThemeProvider';
import { borderRadius } from '@perakita/shared';
import { StyleSheet, View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  elevated?: boolean;
  accent?: boolean;
  compact?: boolean;
}

export function Card({
  children,
  style,
  elevated = true,
  accent = false,
  compact = false,
  ...props
}: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        compact && styles.compact,
        {
          backgroundColor: colors.surface,
          borderColor: accent ? colors.primary : colors.border,
          borderLeftWidth: accent ? 4 : 1,
          ...(elevated && {
            shadowColor: colors.shadow,
          }),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  compact: { padding: 12 },
});
