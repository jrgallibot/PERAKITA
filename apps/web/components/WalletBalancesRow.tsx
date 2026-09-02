'use client';

import { Link } from 'react-router-dom';
import {
  ACCOUNT_PROVIDER_LABELS,
  formatCurrency,
  formatLastBalanceSync,
  type AccountProvider,
} from '@perakita/shared';
import type { WebAccount } from '@/lib/finance';

interface WalletBalancesRowProps {
  accounts: WebAccount[];
}

function isWalletAccount(account: WebAccount): boolean {
  return account.provider === 'gcash' || account.provider === 'maya' || account.provider === 'bank';
}

function providerEmoji(provider: AccountProvider | null): string {
  switch (provider) {
    case 'gcash':
      return '📱';
    case 'maya':
      return '💳';
    case 'bank':
      return '🏦';
    default:
      return '👛';
  }
}

export function WalletBalancesRow({ accounts }: WalletBalancesRowProps) {
  const wallets = accounts.filter(isWalletAccount);
  if (wallets.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Wallet balances</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Balances you refresh from GCash, Maya, or bank apps
          </p>
        </div>
        <Link
          className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold"
          to="/manage#linked-wallets"
        >
          Manage
        </Link>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {wallets.map((account) => {
          const label = account.provider ? ACCOUNT_PROVIDER_LABELS[account.provider] : account.name;
          return (
            <Link
              key={account.id}
              className={`min-w-[132px] shrink-0 rounded-2xl border px-4 py-3 transition hover:border-primary/60 ${
                account.is_linked ? 'border-primary/40 bg-primary/5' : 'border-[var(--border)]'
              }`}
              to="/manage#linked-wallets"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
                <span aria-hidden>{providerEmoji(account.provider)}</span>
                {label}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums">{formatCurrency(account.current_balance)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {account.is_linked
                  ? formatLastBalanceSync(account.last_balance_sync_at) ?? 'Linked'
                  : 'Tap to link'}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
