import { Pressable, StyleSheet } from 'react-native';
import type { SpendingRiskResult } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText } from '@/components/ui';

interface SpendingRiskAlertProps {
  risk: SpendingRiskResult;
  onFixPress?: () => void;
}

export function SpendingRiskAlert({ risk, onFixPress }: SpendingRiskAlertProps) {
  const { colors } = useTheme();
  if (!risk.detected || !risk.message) return null;

  const bg = risk.severity === 'high' ? colors.expense : colors.warning;

  return (
    <Card style={[styles.card, { borderColor: bg, backgroundColor: `${bg}18` }]}>
      <AppText variant="subtitle" style={{ color: bg }}>
        Spending Risk Detected
      </AppText>
      <AppText muted variant="caption" style={{ marginTop: 4 }}>
        {risk.message}
      </AppText>
      {onFixPress ? (
        <Pressable onPress={onFixPress} style={{ marginTop: 8 }}>
          <AppText variant="subtitle" style={{ color: colors.primary }}>
            How can I fix this?
          </AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
});
