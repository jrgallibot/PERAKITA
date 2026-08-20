import { useTheme } from '@/providers/ThemeProvider';
import { fonts } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted, borderColor: colors.border }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={[styles.action, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}>
          <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontFamily: fonts.semibold, marginBottom: 8, textAlign: 'center', letterSpacing: -0.2 },
  message: { fontSize: 14, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  action: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionText: { fontSize: 14, fontFamily: fonts.semibold },
});
