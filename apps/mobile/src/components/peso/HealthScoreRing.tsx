import { View, StyleSheet } from 'react-native';
import type { HealthScoreBreakdown } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText } from '@/components/ui';

interface HealthScoreRingProps {
  health: HealthScoreBreakdown;
}

export function HealthScoreRing({ health }: HealthScoreRingProps) {
  const { colors } = useTheme();
  const tone =
    health.score >= 70 ? colors.income : health.score >= 40 ? colors.warning : colors.expense;

  return (
    <Card compact style={styles.card}>
      <View style={styles.header}>
        <AppText muted variant="caption">
          FINANCIAL HEALTH
        </AppText>
        <AppText variant="display" style={{ color: tone, fontSize: 28 }}>
          {health.score}/100
        </AppText>
      </View>
      {health.strong.length > 0 ? (
        <AppText variant="caption" style={{ color: colors.income }}>
          Strong: {health.strong.join(', ')}
        </AppText>
      ) : null}
      {health.needsImprovement.length > 0 ? (
        <AppText variant="caption" muted style={{ marginTop: 4 }}>
          Needs improvement: {health.needsImprovement.join(', ')}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
