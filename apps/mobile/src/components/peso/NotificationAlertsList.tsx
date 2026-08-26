import { Pressable, StyleSheet, View } from 'react-native';
import type { PesoNotificationAlert } from '@perakita/shared';
import { AppText, Card } from '@/components/ui';
import { useTheme } from '@/providers/ThemeProvider';

export function NotificationAlertsList({
  alerts,
  onDismiss,
}: {
  alerts: PesoNotificationAlert[];
  onDismiss: (id: string) => void;
}) {
  const { colors } = useTheme();
  if (alerts.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {alerts.map((alert) => (
        <Card key={alert.id} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="title">{alert.title}</AppText>
              <AppText muted style={styles.body}>
                {alert.body}
              </AppText>
            </View>
            <Pressable accessibilityLabel="Dismiss alert" onPress={() => onDismiss(alert.id)}>
              <AppText variant="caption">Dismiss</AppText>
            </Pressable>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1 },
  body: { marginTop: 4 },
});
