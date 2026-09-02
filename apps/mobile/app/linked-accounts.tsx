import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  ACCOUNT_PROVIDER_LABELS,
  formatCurrency,
  formatLastBalanceSync,
  type Account,
} from '@perakita/shared';
import { Screen, AppText, Input, Button, Card, IconButton, AmountText } from '@/components/ui';
import { notify } from '@/stores/toastStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthStore } from '@/stores/authStore';
import {
  linkAccount,
  listLinkableAccounts,
  listLinkedAccounts,
  refreshLinkedBalance,
  unlinkAccount,
} from '@/services/linkedAccountService';

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, '').trim());
}

function providerIcon(provider: Account['provider']): keyof typeof Ionicons.glyphMap {
  switch (provider) {
    case 'gcash':
      return 'phone-portrait-outline';
    case 'maya':
      return 'card-outline';
    case 'bank':
      return 'business-outline';
    default:
      return 'wallet-outline';
  }
}

export default function LinkedAccountsScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [maskedId, setMaskedId] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: linkable = [], isLoading } = useQuery({
    queryKey: ['linkable-accounts', user?.id],
    enabled: !!user?.id,
    queryFn: () => listLinkableAccounts(user!.id),
  });

  const { data: linked = [] } = useQuery({
    queryKey: ['linked-accounts', user?.id],
    enabled: !!user?.id,
    queryFn: () => listLinkedAccounts(user!.id),
  });

  const linkedIds = useMemo(() => new Set(linked.map((account) => account.id)), [linked]);

  const openForm = (account: Account) => {
    setActiveId(account.id);
    setBalanceInput(String(account.current_balance));
    setMaskedId(account.masked_identifier ?? '');
  };

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['linkable-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['linked-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['peso-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    ]);
  };

  const onSave = async (account: Account) => {
    if (!user?.id) return;
    const reportedBalance = parseAmount(balanceInput);
    if (!Number.isFinite(reportedBalance) || reportedBalance < 0) {
      notify.error('Enter the balance shown in your wallet or bank app.');
      return;
    }
    setSaving(true);
    try {
      if (account.is_linked) {
        await refreshLinkedBalance({
          userId: user.id,
          accountId: account.id,
          reportedBalance,
        });
        notify.success(`${account.name} balance updated`);
      } else {
        await linkAccount({
          userId: user.id,
          accountId: account.id,
          reportedBalance,
          maskedIdentifier: maskedId.trim() || null,
        });
        notify.success(`${account.name} linked`);
      }
      setActiveId(null);
      await invalidate();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save wallet.');
    } finally {
      setSaving(false);
    }
  };

  const onUnlink = async (account: Account) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await unlinkAccount(user.id, account.id);
      notify.success(`${account.name} unlinked`);
      setActiveId(null);
      await invalidate();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not unlink wallet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" name="close" onPress={() => router.back()} />
        <AppText variant="title">Linked wallets & banks</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card elevated style={[styles.infoCard, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}>
          <Ionicons color={colors.primary} name="information-circle-outline" size={22} />
          <AppText muted style={styles.infoText} variant="caption">
            PeraKita does not connect directly to GCash, Maya, or your bank. Open your real app, check your balance,
            then enter it here to keep this wallet in sync.
          </AppText>
        </Card>

        {isLoading ? (
          <AppText muted>Loading wallets…</AppText>
        ) : (
          linkable.map((account) => {
            const isLinked = linkedIds.has(account.id) || account.is_linked;
            const isOpen = activeId === account.id;
            const providerLabel = account.provider ? ACCOUNT_PROVIDER_LABELS[account.provider] : account.name;
            return (
              <Card key={account.id} elevated style={styles.walletCard}>
                <Pressable onPress={() => openForm(account)} style={styles.walletHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons color={colors.primary} name={providerIcon(account.provider)} size={22} />
                  </View>
                  <View style={styles.walletMeta}>
                    <View style={styles.titleRow}>
                      <AppText variant="subtitle">{providerLabel}</AppText>
                      {isLinked ? (
                        <View style={[styles.linkedPill, { backgroundColor: colors.primaryMuted }]}>
                          <AppText color={colors.primary} variant="caption">
                            Linked
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    {account.masked_identifier ? (
                      <AppText muted variant="caption">
                        {account.masked_identifier}
                      </AppText>
                    ) : null}
                    <AmountText amount={account.current_balance} size="medium" />
                    {account.last_balance_sync_at ? (
                      <AppText muted variant="caption">
                        {formatLastBalanceSync(account.last_balance_sync_at)}
                      </AppText>
                    ) : (
                      <AppText muted variant="caption">
                        {isLinked ? 'Tap to refresh balance' : 'Tap to link this wallet'}
                      </AppText>
                    )}
                  </View>
                  <Ionicons color={colors.textMuted} name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} />
                </Pressable>

                {isOpen ? (
                  <View style={styles.form}>
                    {!isLinked ? (
                      <Input
                        autoCapitalize="none"
                        label="Account hint (optional)"
                        onChangeText={setMaskedId}
                        placeholder="09** *** 1234"
                        value={maskedId}
                      />
                    ) : null}
                    <Input
                      keyboardType="decimal-pad"
                      label="Balance from your app (PHP)"
                      onChangeText={setBalanceInput}
                      placeholder="0.00"
                      value={balanceInput}
                    />
                    <Button
                      loading={saving}
                      onPress={() => void onSave(account)}
                      title={isLinked ? 'Refresh balance' : 'Link wallet'}
                    />
                    {isLinked ? (
                      <Button
                        loading={saving}
                        onPress={() => void onUnlink(account)}
                        title="Unlink"
                        variant="secondary"
                      />
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
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
  headerSpacer: { width: 40 },
  scroll: { paddingBottom: 24, gap: 12 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    padding: 12,
  },
  infoText: { flex: 1, lineHeight: 18 },
  walletCard: { gap: 0, padding: 0, overflow: 'hidden' },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletMeta: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  linkedPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  form: { gap: 12, paddingHorizontal: 14, paddingBottom: 14 },
});
