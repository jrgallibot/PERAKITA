import { useFonts } from 'expo-font';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

export function FontProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular: require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
    PlusJakartaSans_500Medium: require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
    PlusJakartaSans_600SemiBold: require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
    PlusJakartaSans_700Bold: require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
    DMMono_400Regular: require('@expo-google-fonts/dm-mono/400Regular/DMMono_400Regular.ttf'),
    DMMono_500Medium: require('@expo-google-fonts/dm-mono/500Medium/DMMono_500Medium.ttf'),
  });

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
