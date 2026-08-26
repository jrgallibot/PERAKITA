import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Card, AppText } from '@/components/ui';

interface ForecastWarningBannerProps {
  message: string;
  onFixPress?: () => void;
}

export function ForecastWarningBanner({ message, onFixPress }: ForecastWarningBannerProps) {
  const { colors } = useTheme();
  return (
    <Card style={[styles.card, { borderColor: colors.warning, backgroundColor: `${colors.warning}18` }]}>
      <AppText variant="subtitle" style={{ color: colors.warning }}>
        {message}
      </AppText>
      {onFixPress ? (
        <Pressable onPress={onFixPress}>
          <AppText variant="subtitle" style={{ color: colors.primary, marginTop: 8 }}>
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
