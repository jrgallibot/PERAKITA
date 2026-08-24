import type { TransactionType } from '@perakita/shared';

export function transactionKindLabel(type: string): string {
  switch (type) {
    case 'income':
      return 'Income';
    case 'expense':
      return 'Expense';
    case 'loan_received':
      return 'Borrowed / collected';
    case 'loan_given':
      return 'Lent';
    case 'loan_payment':
      return 'Loan payment';
    case 'debt_payment':
      return 'Debt payment';
    case 'transfer':
      return 'Transfer';
    case 'adjustment':
      return 'Budget spend (plan only)';
    default:
      return type;
  }
}

export function signedTransactionAmount(type: string, amount: number): number {
  if (type === 'income' || type === 'loan_received') return amount;
  if (
    type === 'expense' ||
    type === 'adjustment' ||
    type === 'loan_given' ||
    type === 'loan_payment' ||
    type === 'debt_payment'
  ) {
    return -amount;
  }
  return amount;
}

export function isMoneyIn(type: TransactionType | string): boolean {
  return signedTransactionAmount(type, 1) > 0;
}
