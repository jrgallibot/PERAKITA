export const DEFAULT_CURRENCY = 'PHP';
export const DEFAULT_CURRENCY_SYMBOL = '₱';
export const DEFAULT_LOCALE = 'en-PH';

export function formatCurrency(
  amount: number,
  options?: { currency?: string; compact?: boolean; showSign?: boolean }
): string {
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    notation: options?.compact ? 'compact' : 'standard',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (options?.showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  }
  if (amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

export function formatAmountPlain(amount: number): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
