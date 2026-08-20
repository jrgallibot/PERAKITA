import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { FontProvider } from '@/providers/FontProvider';
import { ToastHost } from '@/components/ui/ToastHost';
import { useAuthListener } from '@/hooks/useAuthListener';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { useTheme } from '@/providers/ThemeProvider';

const queryClient = new QueryClient();

function RootNav() {
  useAuthListener();
  useNetworkMonitor();
  useSyncEngine();
  const { scheme } = useTheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="activity-log" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-loan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-loan-payment" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-budget" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <FontProvider>
              <RootNav />
              <ToastHost />
            </FontProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
