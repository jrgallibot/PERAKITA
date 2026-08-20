import { useTheme } from '@/providers/ThemeProvider';
import { type ThemeMode } from '@perakita/shared';
import { saveThemePreference } from '@/services/settingsService';
import { useThemeStore } from '@/stores/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from './IconButton';

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { isDark } = useTheme();

  const cycle = async () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next);
    await saveThemePreference(next);
  };

  const icon: keyof typeof Ionicons.glyphMap = isDark ? 'moon' : 'sunny';

  return (
    <IconButton
      accessibilityLabel={`Theme: ${mode}. Tap to change.`}
      name={icon}
      onPress={cycle}
    />
  );
}
