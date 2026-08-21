import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { CategoryType, TransactionType } from '@perakita/shared';
import { Screen, AppText, Input, Button, IconButton, PaymentModePicker, DateInput } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { accountRepository } from '@/database/repositories/accountRepository';
import { budgetRepository } from '@/database/repositories/budgetRepository';
import { categoryRepository } from '@/database/repositories/categoryRepository';
import { transactionRepository } from '@/database/repositories/transactionRepository';

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

function isOtherCategory(name?: string | null): boolean {
  return (name ?? '').trim().toLowerCase() === 'other';
}

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType: TransactionType = params.type === 'income' ? 'income' : 'expense';
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryType: CategoryType = type === 'income' ? 'income' : 'expense';

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.id],
    enabled: !!user?.id,
    queryFn: () => accountRepository.ensureDefaults(user!.id),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.id, categoryType],
    enabled: !!user?.id,
    queryFn: () => categoryRepository.findAll(user!.id, categoryType),
  });

  const { data: activeBudgets = [] } = useQuery({
    queryKey: ['budgets', 'active', user?.id, date],
    enabled: !!user?.id && type === 'expense',
    queryFn: () => budgetRepository.findActiveForDate(user!.id, date || today()),
  });

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    setCategoryId(null);
    setBudgetId(null);
  }, [type]);

  useEffect(() => {
    if (!budgetId) return;
    if (!activeBudgets.some((budget) => budget.id === budgetId)) {
      setBudgetId(null);
    }
  }, [activeBudgets, budgetId]);
  useEffect(() => {
    if (type !== 'income' || categoryId || categories.length === 0) return;
    const salary = categories.find((c) => c.name === 'Salary') ?? categories[0];
    setCategoryId(salary.id);
  }, [type, categories, categoryId]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );

  const onSave = async () => {
    if (!user?.id) return;
    const parsed = parseAmount(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter an amount greater than zero.');
      return;
    }
    if (!accountId) {
      notify.error('Choose a payment mode.');
      return;
    }
    if (isOtherCategory(selectedCategory?.name) && !description.trim()) {
      notify.error(
        type === 'income' ? 'Describe this other income.' : 'Describe where the money went.'
      );
      return;
    }

    setSaving(true);
    try {
      await transactionRepository.create(user.id, {
        account_id: accountId,
        category_id: categoryId,
        budget_id: type === 'expense' ? budgetId : null,
        type,
        amount: parsed,
        description: description.trim() || selectedCategory?.name || type,
        transaction_date: date || today(),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions', user.id, 'settings-log'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions', user.id, 'log'] }),
      ]);
      notify.success(
        type === 'income'
          ? 'Income saved'
          : budgetId
            ? 'Expense saved — added to selected budget'
            : 'Expense saved'
      );
      router.back();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save this transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
        <AppText variant="title">
          {type === 'income' ? 'Add income' : 'Add expense'}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toggle}>
          {(['expense', 'income'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setType(value)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: type === value ? colors.primary : colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: type === value ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: '700',
                }}
              >
                {value === 'income' ? 'Income' : 'Expense'}
              </Text>
            </Pressable>
          ))}
        </View>

        <AppText muted style={styles.hint}>
          {type === 'income'
            ? 'Money you received — salary, freelance, allowance, or other income. This is added to the account you pick.'
            : 'Spend from Current Balance (your income). Optionally pick a budget (school, work, etc.) so this expense is added into that budget.'}
        </AppText>
        {type === 'expense' ? (
          <Pressable onPress={() => router.replace('/add-loan' as never)} style={styles.loanLink}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Record a loan instead</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.replace('/add-loan' as never)} style={styles.loanLink}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              Borrowed this money? Record it as a loan
            </Text>
          </Pressable>
        )}

        <Input
          keyboardType="decimal-pad"
          label={type === 'income' ? 'Income amount (PHP)' : 'Expense amount (PHP)'}
          onChangeText={setAmount}
          placeholder="0.00"
          value={amount}
        />
        <DateInput
          label="Date"
          onChange={setDate}
          placeholder="Pick a date"
          value={date}
        />

        <PaymentModePicker
          accounts={accounts}
          onAccountsChanged={() => void queryClient.invalidateQueries({ queryKey: ['accounts'] })}
          onSelect={setAccountId}
          selectedId={accountId}
          userId={user?.id ?? ''}
        />

        {type === 'expense' ? (
          <>
            <AppText muted variant="caption" style={styles.sectionLabel}>
              ADD TO BUDGET (OPTIONAL)
            </AppText>
            <AppText muted style={styles.budgetHint}>
              Leave as “Expense log only” to only reduce Current Balance. Pick a budget to add this expense into
              that budget (school, work, etc.).
            </AppText>
            <View style={styles.chips}>
              <Pressable
                onPress={() => setBudgetId(null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: budgetId === null ? colors.primaryMuted : colors.surface,
                    borderColor: budgetId === null ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons color={colors.primary} name="list-outline" size={16} />
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Expense log only</Text>
              </Pressable>
              {activeBudgets.map((budget) => {
                const selected = budgetId === budget.id;
                return (
                  <Pressable
                    key={budget.id}
                    onPress={() => setBudgetId(budget.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primaryMuted : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons color={colors.primary} name="pie-chart-outline" size={16} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{budget.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {activeBudgets.length === 0 ? (
              <AppText muted style={styles.budgetEmpty}>
                No budgets cover this date. Create a budget first, or save as expense log only.
              </AppText>
            ) : null}
          </>
        ) : null}

        <AppText muted variant="caption" style={styles.sectionLabel}>
          {type === 'income' ? 'INCOME TYPE' : 'WHERE DID THE MONEY GO?'}
        </AppText>
        <View style={styles.chips}>
          {categories.map((category) => {
            const selected = categoryId === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => {
                  setCategoryId(category.id);
                  if (!isOtherCategory(category.name)) setDescription('');
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primaryMuted : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  color={category.color ?? colors.primary}
                  name={(category.icon as keyof typeof Ionicons.glyphMap) || 'pricetag-outline'}
                  size={16}
                />
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{category.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {type === 'income' || isOtherCategory(selectedCategory?.name) ? (
          <Input
            label={
              isOtherCategory(selectedCategory?.name)
                ? type === 'income'
                  ? 'Describe this other income'
                  : 'Describe where the money went'
                : 'Income source'
            }
            onChangeText={setDescription}
            placeholder={
              isOtherCategory(selectedCategory?.name)
                ? 'e.g. Hardware, pasalubong, donation'
                : 'e.g. Monthly salary, freelance client'
            }
            value={description}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.footerBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Button
          loading={saving}
          onPress={onSave}
          title={type === 'income' ? 'Save income' : 'Save expense'}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 16 },
  toggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  hint: { marginBottom: 8, lineHeight: 20 },
  budgetHint: { marginBottom: 10, lineHeight: 18 },
  budgetEmpty: { marginBottom: 12, lineHeight: 18 },
  loanLink: { marginBottom: 16, minHeight: 24, justifyContent: 'center' },
  sectionLabel: { marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
});
