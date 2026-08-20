import { useCallback } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, AppText, AmountText, Card, EmptyState, IconButton } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import { signedTransactionAmount, transactionKindLabel } from '@/lib/transactionLabels';

export default function TransactionsScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const { data: transactions = [], refetch, isRefetching } = useQuery({
    queryKey: ['transactions', user?.id],
    enabled: !!user?.id,
    queryFn: () => transactionRepository.findAll(user!.id, 200),
  });

  const deleteIncome = (id: string, label: string) => {
    Alert.alert('Delete income', `Remove ${label}? This subtracts it from Current Balance.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await transactionRepository.softDelete(id);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['transactions'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
                queryClient.invalidateQueries({ queryKey: ['accounts'] }),
                queryClient.invalidateQueries({ queryKey: ['budgets'] }),
              ]);
              notify.deleted('Income deleted');
            } catch (error) {
              notify.error(error instanceof Error ? error.message : 'Could not delete this income.');
            }
          })();
        },
      },
    ]);
  };

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <AppText variant="title">Transactions</AppText>
        <IconButton
          accessibilityLabel="Add transaction"
          name="add"
          onPress={() => router.push('/add-transaction?type=expense' as never)}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        {transactions.length === 0 ? (
          <EmptyState
            actionLabel="Add expense"
            icon="list-outline"
            message="Income and expenses you save will show up here."
            onAction={() => router.push('/add-transaction?type=expense' as never)}
            title="No transactions yet"
          />
        ) : (
          <Card>
            {transactions.map((tx, i) => (
              <View
                key={tx.id}
                style={[
                  styles.row,
                  i < transactions.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.left}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons
                      color={tx.category_color ?? colors.primary}
                      name={(tx.category_icon as keyof typeof Ionicons.glyphMap) || 'wallet-outline'}
                      size={18}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText>{tx.description || tx.category_name || transactionKindLabel(tx.type)}</AppText>
                    <AppText muted variant="caption">
                      {transactionKindLabel(tx.type)}
                      {tx.category_name ? ` · ${tx.category_name}` : ''} · {tx.transaction_date}
                    </AppText>
                  </View>
                </View>
                <View style={styles.right}>
                  <AmountText
                    amount={signedTransactionAmount(tx.type, tx.amount)}
                    showSign
                    size="small"
                  />
                  {tx.type === 'income' ? (
                    <IconButton
                      accessibilityLabel="Delete income"
                      name="trash-outline"
                      onPress={() =>
                        deleteIncome(tx.id, tx.description || tx.category_name || 'this income')
                      }
                      size={18}
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        )}
        <Pressable
          onPress={() => router.push('/add-transaction?type=income' as never)}
          style={[styles.addLink, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Add income</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: { paddingHorizontal: 20, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
