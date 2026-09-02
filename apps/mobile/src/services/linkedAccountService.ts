import {
  ACCOUNT_PROVIDER_LABELS,
  isLinkableProvider,
  reconcileAccountBalance,
  type Account,
  type AccountProvider,
} from '@perakita/shared';
import { accountRepository } from '@/database/repositories/accountRepository';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import { nowIso } from '@/database/database';

export type LinkableAccount = Account & { provider: AccountProvider };

export async function listLinkableAccounts(userId: string): Promise<LinkableAccount[]> {
  await accountRepository.ensureDefaults(userId);
  const accounts = await accountRepository.findAll(userId);
  return accounts.filter(
    (account): account is LinkableAccount =>
      Boolean(account.provider && isLinkableProvider(account.provider) && account.provider !== 'cash')
  );
}

export async function listLinkedAccounts(userId: string): Promise<Account[]> {
  await accountRepository.ensureDefaults(userId);
  return accountRepository.findLinked(userId);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function linkAccount(input: {
  userId: string;
  accountId: string;
  reportedBalance: number;
  maskedIdentifier?: string | null;
}): Promise<Account | null> {
  const account = await accountRepository.findById(input.accountId);
  if (!account || account.user_id !== input.userId) {
    throw new Error('Account not found.');
  }
  if (!account.provider || !isLinkableProvider(account.provider) || account.provider === 'cash') {
    throw new Error('This account cannot be linked as an external wallet.');
  }
  if (!Number.isFinite(input.reportedBalance) || input.reportedBalance < 0) {
    throw new Error('Enter a valid balance from your wallet or bank app.');
  }

  const now = nowIso();
  const delta = reconcileAccountBalance(account.current_balance, input.reportedBalance);
  if (delta !== 0) {
    await transactionRepository.create(input.userId, {
      account_id: account.id,
      category_id: null,
      type: 'adjustment',
      amount: Math.abs(delta),
      description: `Balance sync from ${ACCOUNT_PROVIDER_LABELS[account.provider]}`,
      notes: delta > 0 ? 'Linked wallet balance increase' : 'Linked wallet balance decrease',
      transaction_date: todayIsoDate(),
      payment_method: account.name,
    });
    await accountRepository.adjustBalance(account.id, delta);
  }

  return accountRepository.updateLinkMetadata(account.id, {
    is_linked: true,
    masked_identifier: input.maskedIdentifier?.trim() || null,
    linked_at: now,
    last_balance_sync_at: now,
    provider: account.provider,
  });
}

export async function refreshLinkedBalance(input: {
  userId: string;
  accountId: string;
  reportedBalance: number;
}): Promise<Account | null> {
  const account = await accountRepository.findById(input.accountId);
  if (!account || account.user_id !== input.userId) {
    throw new Error('Account not found.');
  }
  if (!account.is_linked) {
    throw new Error('Link this wallet first.');
  }
  if (!Number.isFinite(input.reportedBalance) || input.reportedBalance < 0) {
    throw new Error('Enter a valid balance from your wallet or bank app.');
  }

  const now = nowIso();
  const delta = reconcileAccountBalance(account.current_balance, input.reportedBalance);
  if (delta !== 0) {
    const providerLabel = account.provider
      ? ACCOUNT_PROVIDER_LABELS[account.provider]
      : account.name;
    await transactionRepository.create(input.userId, {
      account_id: account.id,
      category_id: null,
      type: 'adjustment',
      amount: Math.abs(delta),
      description: `Balance sync from ${providerLabel}`,
      notes: delta > 0 ? 'Manual wallet refresh (increase)' : 'Manual wallet refresh (decrease)',
      transaction_date: todayIsoDate(),
      payment_method: account.name,
    });
    await accountRepository.adjustBalance(account.id, delta);
  }

  return accountRepository.updateLinkMetadata(account.id, {
    is_linked: true,
    masked_identifier: account.masked_identifier,
    linked_at: account.linked_at,
    last_balance_sync_at: now,
    provider: account.provider,
  });
}

export async function unlinkAccount(userId: string, accountId: string): Promise<Account | null> {
  const account = await accountRepository.findById(accountId);
  if (!account || account.user_id !== userId) {
    throw new Error('Account not found.');
  }
  return accountRepository.updateLinkMetadata(accountId, {
    is_linked: false,
    masked_identifier: null,
    linked_at: null,
    last_balance_sync_at: null,
    provider: account.provider,
  });
}
