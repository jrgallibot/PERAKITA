import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  SAVINGS_GOAL_CATEGORIES,
  savingsGoalSchema,
  type SavingsGoalCategory,
  type SavingsGoalPriority,
} from '@perakita/shared';
import { Screen, AppText, Input, Button, IconButton, Card } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { savingsGoalRepository } from '@/database/repositories/savingsGoalRepository';
import { achievementRepository } from '@/database/repositories/achievementRepository';

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

const PRIORITIES: SavingsGoalPriority[] = ['low', 'medium', 'high'];

export default function AddGoalScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [category, setCategory] = useState<SavingsGoalCategory>('phone');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<SavingsGoalPriority>('medium');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedCategory = useMemo(
    () => SAVINGS_GOAL_CATEGORIES.find((c) => c.value === category) ?? SAVINGS_GOAL_CATEGORIES[0],
    [category],
  );

  const onCategoryChange = (value: SavingsGoalCategory) => {
    setCategory(value);
    const meta = SAVINGS_GOAL_CATEGORIES.find((c) => c.value === value);
    if (meta && (name.trim() === '' || SAVINGS_GOAL_CATEGORIES.some((c) => c.defaultName === name))) {
      setName(meta.defaultName);
    }
  };

  const onSave = async () => {
    if (!user?.id) return;
    const parsed = savingsGoalSchema.safeParse({
      name: name.trim() || selectedCategory.defaultName,
      category,
      icon: selectedCategory.icon,
      target_amount: parseAmount(target),
      current_amount: parseAmount(current) || 0,
      target_date: targetDate || null,
      priority,
      description: description.trim() || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? 'Check your goal details');
      return;
    }
    setSaving(true);
    try {
      await savingsGoalRepository.create(user.id, parsed.data);
      if (parsed.data.current_amount >= 1000) {
        await achievementRepository.unlock(user.id, 'first_1000_saved');
      }
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['peso-dashboard'] });
      notify.success('Savings goal created');
      router.back();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.form}>
        <AppText variant="display">Create savings goal</AppText>
        <AppText muted>What are you saving for?</AppText>

        <AppText variant="subtitle">Category</AppText>
        <View style={styles.categoryGrid}>
          {SAVINGS_GOAL_CATEGORIES.map((item) => {
            const active = category === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => onCategoryChange(item.value)}
                style={[
                  styles.categoryChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primaryMuted : colors.surfaceElevated,
                  },
                ]}
              >
                <Ionicons color={colors.primary} name={item.icon as keyof typeof Ionicons.glyphMap} size={18} />
                <AppText variant="caption">{item.label}</AppText>
              </Pressable>
            );
          })}
        </View>

        <Input label="Goal name" value={name} onChangeText={setName} placeholder={selectedCategory.defaultName} />
        <Input label="Target amount (₱)" keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
        <Input
          label="Current saved (₱)"
          keyboardType="decimal-pad"
          value={current}
          onChangeText={setCurrent}
        />
        <Input
          label="Target date (YYYY-MM-DD)"
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="2026-12-25"
        />

        <AppText variant="subtitle">Priority</AppText>
        <View style={styles.row}>
          {PRIORITIES.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.priorityChip,
                {
                  borderColor: priority === p ? colors.primary : colors.border,
                  backgroundColor: priority === p ? colors.primaryMuted : colors.surfaceElevated,
                },
              ]}
            >
              <AppText variant="caption">{p.toUpperCase()}</AppText>
            </Pressable>
          ))}
        </View>

        <Input
          label="Description (optional)"
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Why this goal matters to you"
        />

        <Card compact style={{ gap: 8 }}>
          <View style={styles.previewRow}>
            <View style={[styles.previewIcon, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons
                color={colors.primary}
                name={selectedCategory.icon as keyof typeof Ionicons.glyphMap}
                size={24}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="subtitle">{name.trim() || selectedCategory.defaultName}</AppText>
              <AppText muted variant="caption">
                {selectedCategory.label} · {priority} priority
              </AppText>
            </View>
          </View>
        </Card>

        <Button loading={saving} title="Create goal" onPress={onSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 40 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  previewRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
