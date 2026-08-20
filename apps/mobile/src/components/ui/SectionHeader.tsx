import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, style]}>
      {eyebrow ? (
        <AppText muted variant="label" style={styles.eyebrow}>
          {eyebrow}
        </AppText>
      ) : null}
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? (
            <AppText muted variant="caption" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable hitSlop={10} onPress={onAction}>
            <AppText color={colors.primary} variant="link">
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24, marginBottom: 12, gap: 6 },
  eyebrow: { marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  textBlock: { flex: 1, gap: 4 },
  subtitle: { marginTop: 2 },
});
