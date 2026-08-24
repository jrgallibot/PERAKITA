import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, budgetSpendTimeline } from '@perakita/shared';
import { Screen, AppText, AmountText, Card, EmptyState, IconButton, Input, Button, PaymentModePicker, DateInput, Badge } from '@/components/ui';
import { BudgetSpendFlow } from '@/components/BudgetSpendFlow';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { budgetRepository, type BudgetWithProgress } from '@/database/repositories/budgetRepository';
import { categoryRepository } from '@/database/repositories/categoryRepository';
import { accountRepository } from '@/database/repositories/accountRepository';
import { transactionRepository } from '@/database/repositories/transactionRepository';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isOtherCategory(name?: string | null): boolean {
  return (name ?? '').trim().toLowerCase() === 'other';
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function ProgressBar(props: { percent: number; color: string; track: string }) {
  const width = Math.min(100, Math.max(0, props.percent));
  return (
    <View style={[styles.track, { backgroundColor: props.track }]}>
      <View
        style={[
          styles.fill,
          { width: `${width}%`, backgroundColor: props.percent > 100 ? '#DC2626' : props.color },
        ]}
      />
    </View>
  );
}

export default function BudgetsScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [openBudgetId, setOpenBudgetId] = useState<string | null>(null);
  const [mode, setMode] = useState<'limit' | 'spend' | 'edit'>('spend');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [spendNote, setSpendNote] = useState('');
  const [spendDate, setSpendDate] = useState(todayIso());
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.id],
    enabled: !!user?.id,
    queryFn: () => budgetRepository.findAllWithProgress(user!.id),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.id, 'expense'],
    enabled: !!user?.id,
    queryFn: () => categoryRepository.findAll(user!.id, 'expense'),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.id],
    enabled: !!user?.id,
    queryFn: () => accountRepository.ensureDefaults(user!.id),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['transactions', user?.id, 'budget-spend'],
    enabled: !!user?.id,
    queryFn: () => transactionRepository.findBudgetSpends(user!.id),
  });

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void (async () => {
      const fixed = await transactionRepository.repairBudgetTrackSpends(user.id);
      if (!active || fixed === 0) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
      notify.info(`Restored Current Balance for ${fixed} budget-only spend(s)`);
    })();
    return () => {
      active = false;
    };
  }, [user?.id, queryClient]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    ]);
  };

  const openPanel = (budgetId: string, nextMode: 'limit' | 'spend' | 'edit', budget?: BudgetWithProgress) => {
    setOpenBudgetId(budgetId);
    setMode(nextMode);
    setCategoryId(null);
    setAmount(nextMode === 'edit' && budget ? String(budget.total_amount) : '');
    setSpendNote('');
    setSpendDate(todayIso());
    setPeriodStart(budget?.period_start ?? '');
    setPeriodEnd(budget?.period_end ?? '');
  };

  const addCategoryLimit = async (budget: BudgetWithProgress) => {
    if (!user?.id) return;
    const parsed = Number(amount.replace(/,/g, '').trim());
    if (!categoryId) {
      notify.error('Choose which expense category this limit is for.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a category spending limit greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await budgetRepository.addCategory(user.id, budget.id, categoryId, parsed);
      setAmount('');
      await refresh();
      notify.success('Category limit saved');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save this category limit.');
    } finally {
      setSaving(false);
    }
  };

  const recordSpend = async (budget: BudgetWithProgress) => {
    if (!user?.id) return;
    const parsed = Number(amount.replace(/,/g, '').trim());
    if (!categoryId) {
      notify.error('Choose the category this spend belongs to.');
      return;
    }
    if (!accountId) {
      notify.error('Choose a payment mode (for the spend log only — not Current Balance).');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter how much you spent.');
      return;
    }
    const category = categories.find((item) => item.id === categoryId);
    if (isOtherCategory(category?.name) && !spendNote.trim()) {
      notify.error('Describe where the money went.');
      return;
    }
    setSaving(true);
    try {
      await transactionRepository.create(user.id, {
        account_id: accountId,
        category_id: categoryId,
        budget_id: budget.id,
        type: 'adjustment',
        amount: parsed,
        description: isOtherCategory(category?.name)
          ? `${spendNote.trim()} · ${budget.name}`
          : category
            ? `${category.name} · ${budget.name}`
            : budget.name,
        notes: 'Budget track only — not from Current Balance',
        transaction_date: spendDate || todayIso(),
      });
      setAmount('');
      setSpendNote('');
      await refresh();
      notify.success('Spend recorded — subtracted from this budget only');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not record this spend.');
    } finally {
      setSaving(false);
    }
  };

  const updateTotal = async (budget: BudgetWithProgress) => {
    if (!user?.id) return;
    const parsed = Number(amount.replace(/,/g, '').trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a new spending cap greater than zero.');
      return;
    }
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      notify.error('Pick a start date and an end date on or after it.');
      return;
    }
    setSaving(true);
    try {
      await budgetRepository.update(user.id, budget.id, {
        total_amount: parsed,
        period_start: periodStart,
        period_end: periodEnd,
      });
      setAmount('');
      await refresh();
      notify.info('Budget updated');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update this budget.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBudget = (budget: BudgetWithProgress) => {
    if (!user?.id) return;
    Alert.alert('Delete budget', `Remove ${budget.name}? Past expenses stay in your transaction log.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await budgetRepository.softDelete(user.id, budget.id);
              await refresh();
              notify.deleted('Budget deleted');
            } catch (error) {
              notify.error(error instanceof Error ? error.message : 'Could not delete this budget.');
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title" style={styles.title}>
          Budgets
        </AppText>
        <IconButton
          accessibilityLabel="Add budget"
          name="add"
          onPress={() => router.push('/add-budget' as never)}
        />
      </View>

      {budgets.length === 0 ? (
        <EmptyState
          actionLabel="Create a budget"
          icon="pie-chart-outline"
          message="Set a budget plan (school, work, etc.). Record spend here to subtract from the budget only — not from Current Balance. To reduce Current Balance, use Add expense (and optionally pick a budget there)."
          onAction={() => router.push('/add-budget' as never)}
          title="No budgets yet"
        />
      ) : (
        budgets.map((budget) => {
          const over = budget.spent > budget.total_amount;
          const remaining = Math.max(0, budget.total_amount - budget.spent);
          const overBy = over ? budget.spent - budget.total_amount : 0;
          const timeline = budgetSpendTimeline(
            budget,
            expenses.filter((item) => item.budget_id === budget.id)
          );
          return (
            <Card key={budget.id} style={styles.card}>
              <AppText variant="caption" muted style={styles.step}>
                1. BUDGET
              </AppText>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText variant="title">{budget.name}</AppText>
                  <Badge
                    label={over ? 'Over budget' : `${Math.round(budget.percent)}% used`}
                    variant={over ? 'danger' : 'success'}
                  />
                </View>
              </View>
              <AppText muted variant="caption">
                {budget.period_start} → {budget.period_end}
              </AppText>
              <View style={styles.moneyBlock}>
                <AppText muted variant="caption" style={styles.moneyLabel}>
                  BUDGET LEFT
                </AppText>
                <AmountText
                  amount={remaining}
                  color={over ? colors.expense : colors.income}
                  size="large"
                  style={styles.moneyHero}
                />
                <AppText muted variant="caption">
                  plan {formatCurrency(budget.total_amount)} · spent {formatCurrency(budget.spent)}
                  {over ? ` · over by ${formatCurrency(overBy)}` : ''}
                </AppText>
              </View>
              <ProgressBar color={over ? colors.expense : colors.primary} percent={budget.percent} track={colors.border} />

              {budget.categories.map((cat) => {
                const pct = cat.limit_amount > 0 ? Math.round((cat.spent / cat.limit_amount) * 100) : 0;
                return (
                  <View key={cat.id} style={styles.catRow}>
                    <View style={styles.catHead}>
                      <View style={[styles.dot, { backgroundColor: cat.color ?? colors.primary }]} />
                      <AppText style={{ flex: 1 }}>{cat.name}</AppText>
                      <AppText muted variant="caption">
                        {formatCurrency(cat.spent)} / {formatCurrency(cat.limit_amount)}
                      </AppText>
                    </View>
                    <ProgressBar color={cat.color ?? colors.primary} percent={pct} track={colors.border} />
                  </View>
                );
              })}

              <AppText variant="caption" muted style={styles.step}>
                2. SPEND FROM THIS BUDGET
              </AppText>
              <BudgetSpendFlow
                emptyLabel="No spend yet. Add an expense with this budget selected, or record one below."
                entries={timeline}
              />

              {openBudgetId === budget.id ? (
                <View style={styles.addBox}>
                  {mode === 'spend' ? (
                    <>
                      <AppText variant="caption" muted style={styles.step}>
                        3. RECORD SPEND
                      </AppText>
                      <AppText muted variant="caption">
                        Subtracts from this budget plan only — does not change Current Balance.
                      </AppText>
                      <View style={styles.grid}>
                        {categories.map((category) => {
                          const selected = categoryId === category.id;
                          return (
                            <View key={category.id} style={styles.cellWrap}>
                              <Pressable
                                onPress={() => {
                                  setCategoryId(category.id);
                                  if (!isOtherCategory(category.name)) setSpendNote('');
                                }}
                                style={[
                                  styles.cell,
                                  {
                                    backgroundColor: selected ? colors.primaryMuted : colors.surface,
                                    borderColor: selected ? colors.primary : colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={{ color: colors.textPrimary, fontWeight: '700', textAlign: 'center' }}
                                >
                                  {category.name}
                                </Text>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                      {isOtherCategory(categories.find((item) => item.id === categoryId)?.name) ? (
                        <Input
                          label="Describe where the money went"
                          onChangeText={setSpendNote}
                          placeholder="e.g. Hardware, pasalubong, donation"
                          value={spendNote}
                        />
                      ) : null}
                      <PaymentModePicker
                        accounts={accounts}
                        onAccountsChanged={() => void queryClient.invalidateQueries({ queryKey: ['accounts'] })}
                        onSelect={setAccountId}
                        selectedId={accountId}
                        userId={user?.id ?? ''}
                      />
                      <DateInput
                        label="Date"
                        onChange={setSpendDate}
                        placeholder="Pick date"
                        value={spendDate}
                      />
                      <Input
                        keyboardType="decimal-pad"
                        label="Amount spent (PHP)"
                        onChangeText={setAmount}
                        placeholder="0.00"
                        value={amount}
                      />
                      <Button
                        loading={saving}
                        onPress={() => void recordSpend(budget)}
                        title="Record spend"
                      />
                    </>
                  ) : null}
                  {mode === 'limit' ? (
                    <>
                      <AppText variant="caption" muted style={styles.step}>
                        CATEGORY LIMIT
                      </AppText>
                      <View style={styles.grid}>
                        {categories.map((category) => {
                          const selected = categoryId === category.id;
                          return (
                            <View key={category.id} style={styles.cellWrap}>
                              <Pressable
                                onPress={() => setCategoryId(category.id)}
                                style={[
                                  styles.cell,
                                  {
                                    backgroundColor: selected ? colors.primaryMuted : colors.surface,
                                    borderColor: selected ? colors.primary : colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={{ color: colors.textPrimary, fontWeight: '700', textAlign: 'center' }}
                                >
                                  {category.name}
                                </Text>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                      <Input
                        keyboardType="decimal-pad"
                        label="Limit (PHP)"
                        onChangeText={setAmount}
                        placeholder="0.00"
                        value={amount}
                      />
                      <Button
                        loading={saving}
                        onPress={() => void addCategoryLimit(budget)}
                        title="Save category limit"
                      />
                    </>
                  ) : null}
                  {mode === 'edit' ? (
                    <>
                      <AppText variant="caption" muted style={styles.step}>
                        UPDATE BUDGET
                      </AppText>
                      <Input
                        keyboardType="decimal-pad"
                        label="Update spending cap (PHP)"
                        onChangeText={setAmount}
                        placeholder="0.00"
                        value={amount}
                      />
                      <DateInput
                        label="Starts"
                        onChange={(value) => {
                          setPeriodStart(value);
                          if (periodEnd && periodEnd < value) setPeriodEnd(value);
                        }}
                        placeholder="Pick start date"
                        value={periodStart}
                      />
                      <DateInput
                        label="Ends"
                        minimumDate={periodStart ? parseIsoDate(periodStart) : undefined}
                        onChange={setPeriodEnd}
                        placeholder="Pick end date"
                        value={periodEnd}
                      />
                      <Button
                        loading={saving}
                        onPress={() => void updateTotal(budget)}
                        title="Update budget"
                      />
                    </>
                  ) : null}
                </View>
              ) : (
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button
                      onPress={() => openPanel(budget.id, 'spend')}
                      title="Record next spend"
                      variant="secondary"
                    />
                  </View>
                  <IconButton
                    accessibilityLabel="Add category limit"
                    name="pricetag-outline"
                    onPress={() => openPanel(budget.id, 'limit')}
                  />
                  <IconButton
                    accessibilityLabel="Update budget"
                    name="create-outline"
                    onPress={() => openPanel(budget.id, 'edit', budget)}
                  />
                  <IconButton
                    accessibilityLabel="Delete budget"
                    name="trash-outline"
                    onPress={() => deleteBudget(budget)}
                  />
                </View>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  title: { marginBottom: 0 },
  card: { marginBottom: 16, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  moneyBlock: { gap: 4, marginTop: 4, marginBottom: 4 },
  moneyLabel: { letterSpacing: 0.6, fontWeight: '700' },
  moneyHero: { fontSize: 36, lineHeight: 42 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  catRow: { gap: 6 },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  step: { letterSpacing: 0.6, fontWeight: '700', marginTop: 4 },
  addBox: { gap: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: '50%', paddingHorizontal: 4, marginBottom: 8 },
  cell: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
