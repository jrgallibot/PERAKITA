import type { AccountProvider } from '../types/index';

export function reconcileAccountBalance(currentBalance: number, reportedBalance: number): number {
  const current = Number.isFinite(currentBalance) ? currentBalance : 0;
  const reported = Number.isFinite(reportedBalance) ? reportedBalance : 0;
  return Math.round((reported - current) * 100) / 100;
}

export function providerFromAccountName(name: string): AccountProvider {
  const key = name.trim().toLowerCase();
  if (key === 'cash') return 'cash';
  if (key === 'gcash') return 'gcash';
  if (key === 'maya') return 'maya';
  if (key === 'bank') return 'bank';
  return 'other';
}

export const ACCOUNT_PROVIDER_LABELS: Record<AccountProvider, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank',
  other: 'Other',
};

export function formatLastBalanceSync(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days}d ago`;
  return `Updated ${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;
}

export function isLinkableProvider(provider: AccountProvider | null | undefined): boolean {
  return provider === 'gcash' || provider === 'maya' || provider === 'bank' || provider === 'other';
}
