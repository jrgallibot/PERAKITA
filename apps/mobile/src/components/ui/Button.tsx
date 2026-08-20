import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme/fonts';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
      },
      text: { color: '#FFFFFF' },
    },
    secondary: {
      container: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.border },
      text: { color: colors.primary },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: colors.primary },
    },
    danger: {
      container: { backgroundColor: colors.expense },
      text: { color: '#FFFFFF' },
    },
  };

  const v = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        v.container,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color as string} />
      ) : (
        <Text style={[styles.text, v.text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fullWidth: { width: '100%' },
  text: { fontSize: 16, fontFamily: fonts.semibold, letterSpacing: -0.1 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
});
