import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_CURRENCY, sortPaymentAccounts, type Account } from '@perakita/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { accountRepository } from '@/database/repositories/accountRepository';
import { notify } from '@/stores/toastStore';
import { AppText } from './AppText';
import { Input } from './Input';

type PaymentModePickerProps = {
  userId: string;
  accounts: Account[];
  selectedId: string | null;
  onSelect: (accountId: string) => void;
  onAccountsChanged?: () => void;
  label?: string;
};

export function PaymentModePicker({
  userId,
  accounts,
  selectedId,
  onSelect,
  onAccountsChanged,
  label = 'PAYMENT MODE',
}: PaymentModePickerProps) {
  const { colors } = useTheme();
  const [customName, setCustomName] = useState('');
  const [adding, setAdding] = useState(false);
  const ordered = sortPaymentAccounts(accounts);

  const addCustom = async () => {
    const name = customName.trim();
    if (!name) {
      notify.error('Enter a name like GCash, Palawan, or PayMaya.');
      return;
    }
    const exists = accounts.find((account) => account.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      onSelect(exists.id);
      setCustomName('');
      return;
    }
    setAdding(true);
    try {
      const created = await accountRepository.create(userId, {
        name,
        type: 'other',
        initial_balance: 0,
        currency: DEFAULT_CURRENCY,
      });
      setCustomName('');
      onSelect(created.id);
      onAccountsChanged?.();
      notify.success('Payment mode saved');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not add this payment mode.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View>
      <AppText muted variant="caption" style={styles.sectionLabel}>
        {label}
      </AppText>
      <View style={styles.grid}>
        {ordered.map((account) => {
          const selected = selectedId === account.id;
          return (
            <View key={account.id} style={styles.cellWrap}>
              <Pressable
                onPress={() => onSelect(account.id)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: selected ? colors.primaryMuted : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700', textAlign: 'center' }}>
                  {account.name}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.addRow}>
        <View style={{ flex: 1 }}>
          <Input
            autoCapitalize="words"
            label="Add payment mode"
            onChangeText={setCustomName}
            placeholder="e.g. Palawan, PayMaya"
            value={customName}
          />
        </View>
        <Pressable
          disabled={adding}
          onPress={() => void addCustom()}
          style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{adding ? '…' : 'Add'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: 8, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  cellWrap: { width: '50%', paddingHorizontal: 4, marginBottom: 8 },
  cell: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 16 },
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
