import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme/fonts';
import { isOnboardingComplete } from '@/services/pesoEngineService';
import { usePesoNotificationScheduler } from '@/hooks/usePesoNotificationScheduler';

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: onboarded, isLoading } = useQuery({
    queryKey: ['onboarding', user?.id],
    enabled: !!user?.id,
    queryFn: () => isOnboardingComplete(user!.id),
  });

  usePesoNotificationScheduler(user?.id);

  if (!initialized || (user && isLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (onboarded === false) {
    return <Redirect href={'/(onboarding)/' as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 58 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
              }
            : { elevation: 8 }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.semibold,
          letterSpacing: 0.15,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons color={color} name={focused ? 'home' : 'home-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons color={color} name={focused ? 'list' : 'list-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons color={color} name={focused ? 'pie-chart' : 'pie-chart-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons color={color} name={focused ? 'flag' : 'flag-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons color={color} name={focused ? 'grid' : 'grid-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="loans" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
