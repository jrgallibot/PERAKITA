import { useTheme } from '@/providers/ThemeProvider';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
}

export function IconButton({ name, onPress, accessibilityLabel, size = 22 }: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      hitSlop={8}
    >
      <Ionicons name={name} size={size} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  pressed: { opacity: 0.7 },
});
