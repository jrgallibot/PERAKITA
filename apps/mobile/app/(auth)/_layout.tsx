import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { ThemeToggle } from '@/components/ui';

export default function AuthLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.toggle, { top: insets.top + 4, right: 12 }]}>
        <ThemeToggle />
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toggle: { position: 'absolute', zIndex: 10 },
});
