import { router } from 'expo-router';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { Screen, AppText, Card } from '@/components/ui';

const LINKS = [
  { label: 'Loans & debts', icon: 'people-outline' as const, href: '/(tabs)/loans' },
  { label: 'Reports & analytics', icon: 'bar-chart-outline' as const, href: '/(tabs)/reports' },
  { label: 'Recurring expenses', icon: 'repeat-outline' as const, href: '/add-recurring-expense' },
  { label: 'AI assistant', icon: 'chatbubble-ellipses-outline' as const, href: '/ai-assistant' },
  { label: 'Activity log', icon: 'time-outline' as const, href: '/activity-log' },
  { label: 'Settings', icon: 'settings-outline' as const, href: '/settings' },
];

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AppText variant="display">More</AppText>
          <AppText muted>{user?.email}</AppText>
        </View>
        <Card compact style={{ padding: 0, overflow: 'hidden' }}>
          {LINKS.map((link, i) => (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href as never)}
              style={[
                styles.row,
                i < LINKS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <Ionicons color={colors.primary} name={link.icon} size={22} />
              <AppText variant="subtitle" style={{ flex: 1 }}>
                {link.label}
              </AppText>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16 },
  header: { gap: 4, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
});
