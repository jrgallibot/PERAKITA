import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme/fonts';
import { StyleSheet, Text, View } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'offline' | 'syncing';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const { colors, isDark } = useTheme();

  const variants: Record<BadgeVariant, { bg: string; text: string; dot?: string }> = {
    default: { bg: colors.primaryMuted, text: colors.primary },
    success: { bg: isDark ? '#064E3B' : '#D1FAE5', text: colors.income },
    warning: { bg: isDark ? '#78350F' : '#FEF3C7', text: colors.warning },
    danger: { bg: isDark ? '#7F1D1D' : '#FEE2E2', text: colors.expense },
    offline: { bg: colors.surfaceElevated, text: colors.textSecondary, dot: colors.warning },
    syncing: { bg: colors.primaryMuted, text: colors.primary, dot: colors.primary },
  };

  const v = variants[variant];

  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: `${v.text}22` }]}>
      {v.dot ? <View style={[styles.dot, { backgroundColor: v.dot }]} /> : null}
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 0.15 },
});
