import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@perakita/shared';
import { Screen, AppText, AmountText, Card, EmptyState, IconButton } from '@/components/ui';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import {
  signedTransactionAmount,
  transactionKindLabel,
} from '@/lib/transactionLabels';

export default function ActivityLogScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'loan'>('all');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.id, 'log'],
    enabled: !!user?.id,
    queryFn: () => transactionRepository.findAll(user!.id, 500),
  });

  const visible = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'income') return tx.type === 'income' || tx.type === 'loan_received';
    if (filter === 'expense') return tx.type === 'expense' || tx.type === 'debt_payment' || tx.type === 'loan_given';
    return (
      tx.type === 'loan_received' ||
      tx.type === 'loan_given' ||
      tx.type === 'loan_payment' ||
      tx.type === 'debt_payment'
    );
  });

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
        <AppText variant="title" style={styles.title}>
          Activity log
        </AppText>
        <View style={{ width: 40 }} />
      </View>
      <AppText muted style={styles.intro}>
        Every income, expense, loan, and payment you saved on this phone.
      </AppText>

      <View style={styles.filters}>
        {(
          [
            ['all', 'All'],
            ['income', 'Income'],
            ['expense', 'Expense'],
            ['loan', 'Loans'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: filter === value ? colors.primary : colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: filter === value ? '#FFFFFF' : colors.textPrimary,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <EmptyState
          icon="time-outline"
          message="Save income, expenses, or loans to see them here."
          title="No activity yet"
        />
      ) : (
        <Card>
          {visible.map((tx, i) => {
            const signed = signedTransactionAmount(tx.type, tx.amount);
            return (
              <View
                key={tx.id}
                style={[
                  styles.row,
                  i < visible.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <AppText>{tx.description || tx.category_name || transactionKindLabel(tx.type)}</AppText>
                  <AppText muted variant="caption">
                    {transactionKindLabel(tx.type)}
                    {tx.category_name ? ` · ${tx.category_name}` : ''}
                    {` · ${tx.transaction_date}`}
                  </AppText>
                  <AppText muted variant="caption">
                    {tx.account_name ?? 'Account'} · logged {new Date(tx.created_at).toLocaleString()}
                  </AppText>
                </View>
                <AmountText amount={signed} showSign size="small" />
              </View>
            );
          })}
        </Card>
      )}
      {visible.length > 0 ? (
        <AppText muted variant="caption" style={styles.count}>
          {visible.length} record{visible.length === 1 ? '' : 's'} · {formatCurrency(
            visible.reduce((sum, tx) => sum + signedTransactionAmount(tx.type, tx.amount), 0)
          )}{' '}
          net
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { marginBottom: 0 },
  intro: { marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  row: { paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start' },
  count: { marginTop: 12, marginBottom: 24 },
});
