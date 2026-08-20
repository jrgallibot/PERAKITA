import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';
import { AmountText } from './AmountText';

interface HeroBalanceCardProps {
  label: string;
  amount: number;
  hint: string;
  badge?: string;
}

export function HeroBalanceCard({ label, amount, hint, badge }: HeroBalanceCardProps) {
  const { colors, isDark } = useTheme();

  const gradientColors = isDark
    ? (['#134E4A', '#0F172A'] as const)
    : ([colors.gradientStart, '#CCFBF1'] as const);

  return (
    <LinearGradient
      colors={gradientColors}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.wrap, { borderColor: colors.border }]}
    >
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <AppText muted variant="label">
            {label}
          </AppText>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.surface }]}>
              <AppText variant="caption" color={colors.primary}>
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AmountText amount={amount} size="large" style={styles.amount} />
        <AppText muted variant="caption">
          {hint}
        </AppText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  inner: { padding: 20, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  amount: { marginVertical: 4 },
});
