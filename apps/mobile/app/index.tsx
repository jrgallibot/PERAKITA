import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { isOnboardingComplete } from '@/services/pesoEngineService';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { colors } = useTheme();

  const { data: onboarded, isLoading } = useQuery({
    queryKey: ['onboarding', user?.id],
    enabled: !!user?.id,
    queryFn: () => isOnboardingComplete(user!.id),
  });

  if (!initialized || (user && isLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (user) {
    if (onboarded === false) {
      return <Redirect href={'/(onboarding)/' as never} />;
    }
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
