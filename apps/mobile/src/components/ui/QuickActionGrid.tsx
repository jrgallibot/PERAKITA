import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppText } from './AppText';

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'expense' | 'income' | 'loan' | 'budget';
};

interface QuickActionGridProps {
  actions: QuickAction[];
}

const toneIcons: Record<NonNullable<QuickAction['tone']>, { bg: string; fg: string }> = {
  expense: { bg: '#FEE2E2', fg: '#DC2626' },
  income: { bg: '#D1FAE5', fg: '#059669' },
  loan: { bg: '#FEF3C7', fg: '#D97706' },
  budget: { bg: '#E0E7FF', fg: '#4F46E5' },
};

export function QuickActionGrid({ actions }: QuickActionGridProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {actions.map((action) => {
        const palette = action.tone ? toneIcons[action.tone] : { bg: colors.primaryMuted, fg: colors.primary };
        return (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
              <Ionicons color={palette.fg} name={action.icon} size={22} />
            </View>
            <AppText variant="subtitle">{action.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
