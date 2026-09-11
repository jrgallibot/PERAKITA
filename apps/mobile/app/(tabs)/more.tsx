import { router } from 'expo-router';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { Screen, AppText, Card } from '@/components/ui';
import { loadEmergencyFund } from '@/services/emergencyFundService';
import { loadGoalsDashboard } from '@/services/savingsGoalService';

const LINKS = [
  { label: 'Savings', icon: 'wallet-outline' as const, href: '/(tabs)/goals' },
  { label: 'Emergency fund', icon: 'shield-checkmark-outline' as const, href: '/emergency-fund' },
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
  const { data: modules } = useQuery({
    queryKey: ['manage-modules', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [savings, emergency] = await Promise.all([
        loadGoalsDashboard(user!.id),
        loadEmergencyFund(user!.id),
      ]);
      return { savings, emergency };
    },
  });

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AppText variant="display">More</AppText>
          <AppText muted>{user?.email}</AppText>
        </View>

        <View style={styles.moduleGrid}>
          <Pressable
            onPress={() => router.push('/(tabs)/goals' as never)}
            style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons color={colors.primary} name="wallet-outline" size={22} />
            <AppText muted variant="caption">
              Savings
            </AppText>
            <AppText variant="title">{formatCurrency(modules?.savings.summary.totalSaved ?? 0)}</AppText>
            <AppText muted variant="caption">
              {(modules?.savings.summary.overallProgress ?? 0).toFixed(1)}% funded
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/emergency-fund' as never)}
            style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons color={colors.primary} name="shield-checkmark-outline" size={22} />
            <AppText muted variant="caption">
              Emergency
            </AppText>
            <AppText variant="title">{formatCurrency(modules?.emergency.summary.currentAmount ?? 0)}</AppText>
            <AppText muted variant="caption">
              {(modules?.emergency.summary.monthsCovered ?? 0).toFixed(1)} months
            </AppText>
          </Pressable>
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
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: { flexGrow: 1, minWidth: '47%', borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
});
