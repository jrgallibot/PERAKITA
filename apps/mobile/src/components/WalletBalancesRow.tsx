import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ACCOUNT_PROVIDER_LABELS,
  formatLastBalanceSync,
  type Account,
} from '@perakita/shared';
import { AppText, AmountText, Card, SectionHeader } from '@/components/ui';
import { useTheme } from '@/providers/ThemeProvider';

interface WalletBalancesRowProps {
  accounts: Account[];
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

export function WalletBalancesRow({ accounts }: WalletBalancesRowProps) {
  const { colors } = useTheme();
  const wallets = accounts.filter(
    (account) => account.provider === 'gcash' || account.provider === 'maya' || account.provider === 'bank'
  );

  if (wallets.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader
        actionLabel="Manage"
        onAction={() => router.push('/linked-accounts' as never)}
        subtitle="Balances you refresh from GCash, Maya, or bank apps"
        title="Wallet balances"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {wallets.map((account) => {
          const label = account.provider ? ACCOUNT_PROVIDER_LABELS[account.provider] : account.name;
          return (
            <Pressable
              key={account.id}
              onPress={() => router.push('/linked-accounts' as never)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed ? colors.primaryMuted : colors.surfaceElevated,
                  borderColor: account.is_linked ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.chipTop}>
                <Ionicons
                  color={account.is_linked ? colors.primary : colors.textMuted}
                  name={providerIcon(account.provider)}
                  size={18}
                />
                <AppText variant="caption">{label}</AppText>
              </View>
              <AmountText amount={account.current_balance} size="medium" />
              <AppText muted variant="caption">
                {account.is_linked
                  ? formatLastBalanceSync(account.last_balance_sync_at) ?? 'Linked'
                  : 'Tap to link'}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { gap: 10, paddingRight: 4 },
  chip: {
    minWidth: 132,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  chipTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
