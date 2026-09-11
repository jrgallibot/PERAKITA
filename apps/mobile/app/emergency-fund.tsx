import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { emergencyFundSchema, formatCurrency } from '@perakita/shared';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';
import { loadEmergencyFund, saveEmergencyFund } from '@/services/emergencyFundService';
import { notify } from '@/stores/toastStore';
import { Screen, AppText, Button, Card, IconButton, Input, SectionHeader } from '@/components/ui';

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

function formatInput(value: number): string {
  return value > 0 ? String(Math.round(value * 100) / 100) : '';
}

export default function EmergencyFundScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['emergency-fund', user?.id],
    enabled: !!user?.id,
    queryFn: () => loadEmergencyFund(user!.id),
  });

  useEffect(() => {
    if (!data) return;
    setTarget(formatInput(data.fund?.target_amount ?? data.summary.recommendedTarget));
    setCurrent(formatInput(data.fund?.current_amount ?? 0));
  }, [data]);

  const summary = data?.summary;

  const onSave = async () => {
    if (!user?.id || !summary) return;
    const parsed = emergencyFundSchema.safeParse({
      target_amount: parseAmount(target),
      current_amount: parseAmount(current) || 0,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? 'Check emergency fund details');
      return;
    }
    setSaving(true);
    try {
      await saveEmergencyFund(user.id, {
        ...parsed.data,
        recommended_target: summary.recommendedTarget,
      });
      await queryClient.invalidateQueries({ queryKey: ['emergency-fund'] });
      await queryClient.invalidateQueries({ queryKey: ['peso-dashboard'] });
      notify.success('Emergency fund updated');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save emergency fund');
    } finally {
      setSaving(false);
    }
  };

  const progress = summary?.progressPercentage ?? 0;

  return (
    <Screen scroll={false} padded={false}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <IconButton accessibilityLabel="Back" name="arrow-back" onPress={() => router.back()} />
        <AppText variant="title">Emergency Fund</AppText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        <View style={styles.hero}>
          <AppText muted variant="caption">
            SAFETY NET
          </AppText>
          <AppText variant="display">{formatCurrency(summary?.currentAmount ?? 0)}</AppText>
          <AppText muted>
            of {formatCurrency(summary?.targetAmount ?? 0)} saved
          </AppText>
          <View style={[styles.bar, { backgroundColor: colors.inputBackground }]}>
            <View style={[styles.barFill, { width: `${Math.min(100, progress)}%`, backgroundColor: colors.primary }]} />
          </View>
          <AppText variant="subtitle">{progress.toFixed(1)}% funded</AppText>
        </View>

        <Card style={styles.section}>
          <SectionHeader title="Emergency fund health" />
          <View style={styles.statGrid}>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Remaining
              </AppText>
              <AppText variant="subtitle">{formatCurrency(summary?.remainingAmount ?? 0)}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Months covered
              </AppText>
              <AppText variant="subtitle">{(summary?.monthsCovered ?? 0).toFixed(1)}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText muted variant="caption">
                Recommended
              </AppText>
              <AppText variant="subtitle">{formatCurrency(summary?.recommendedTarget ?? 0)}</AppText>
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionHeader title="Update fund" />
          <Input label="Target amount (PHP)" keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
          <Input label="Current saved (PHP)" keyboardType="decimal-pad" value={current} onChangeText={setCurrent} />
          <Button loading={saving} title="Save emergency fund" onPress={onSave} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 8 },
  bar: { width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', marginVertical: 8 },
  barFill: { height: '100%', borderRadius: 6 },
  section: { gap: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { minWidth: 96, flex: 1, gap: 4 },
});
