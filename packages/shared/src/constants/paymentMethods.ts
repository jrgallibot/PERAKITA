export const PAYMENT_METHODS = ['Cash', 'GCash', 'Maya', 'Bank', 'Other'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'Cash';

export const DEFAULT_ACCOUNTS = [
  { name: 'Cash', type: 'cash' as const },
  { name: 'GCash', type: 'ewallet' as const },
  { name: 'Maya', type: 'ewallet' as const },
  { name: 'Bank', type: 'bank' as const },
];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function uniquePaymentAccounts<T extends { name: string }>(accounts: T[]): T[] {
  const seen = new Set<string>();
  return accounts.filter((account) => {
    const key = account.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortPaymentAccounts<T extends { name: string }>(accounts: T[]): T[] {
  const order = DEFAULT_ACCOUNTS.map((item) => item.name.toLowerCase());
  return uniquePaymentAccounts([...accounts]).sort((a, b) => {
    const left = order.indexOf(a.name.toLowerCase());
    const right = order.indexOf(b.name.toLowerCase());
    if (left === -1 && right === -1) return a.name.localeCompare(b.name);
    if (left === -1) return 1;
    if (right === -1) return -1;
    return left - right;
  });
}
