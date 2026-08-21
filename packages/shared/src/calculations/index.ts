/** Balance calculation stubs — full implementation in Phase 2 */

export function calculateAccountBalance(
  initialBalance: number,
  _transactionTotal: number
): number {
  return initialBalance + _transactionTotal;
}

export function calculateNetWorth(
  totalAssets: number,
  totalReceivables: number,
  totalDebt: number
): number {
  return totalAssets + totalReceivables - totalDebt;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days from start date to due date. Same day = 0. */
export function daysBetweenDates(startDate: string, dueDate: string): number {
  const start = parseIsoDay(startDate);
  const due = parseIsoDay(dueDate);
  if (!start || !due) return 0;
  const ms = due.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * Simple interest over a date range.
 * Rate is percent per 30-day month, e.g. 5 = 5% per month.
 * Interest = principal × rate% × (days / 30).
 */
export function calculateLoanInterest(
  principal: number,
  interestRatePercent: number,
  options?: { startDate?: string | null; dueDate?: string | null }
) {
  const safePrincipal = Number.isFinite(principal) && principal > 0 ? principal : 0;
  const rate =
    Number.isFinite(interestRatePercent) && interestRatePercent > 0 ? interestRatePercent : 0;
  const startDate = options?.startDate?.trim() || '';
  const dueDate = options?.dueDate?.trim() || '';
  const days = startDate && dueDate ? daysBetweenDates(startDate, dueDate) : 0;
  const months = days / 30;
  const interest = roundMoney(safePrincipal * (rate / 100) * months);
  const total = roundMoney(safePrincipal + interest);
  return {
    principal: roundMoney(safePrincipal),
    interestRate: rate,
    days,
    months: roundMoney(months),
    interest,
    total,
    startDate: startDate || null,
    dueDate: dueDate || null,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDay(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toIsoDay(date);
}

export const KINSENA_GRACE_DAYS = 5;

export type KinsenaWindow = {
  due: string;
  graceEnds: string;
  label: string;
};

export function kinsenaWindowsAround(isoDate: string): KinsenaWindow[] {
  const date = parseIsoDay(isoDate);
  if (!date) return [];
  const windows: KinsenaWindow[] = [];
  for (const offset of [-1, 0, 1]) {
    const cursor = new Date(date.getFullYear(), date.getMonth() + offset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const mid = toIsoDay(new Date(year, month, 15));
    const end = toIsoDay(new Date(year, month + 1, 0));
    windows.push({
      due: mid,
      graceEnds: addDaysIso(mid, KINSENA_GRACE_DAYS),
      label: '15th kinsena',
    });
    windows.push({
      due: end,
      graceEnds: addDaysIso(end, KINSENA_GRACE_DAYS),
      label: 'end-of-month kinsena',
    });
  }
  return windows.sort((a, b) => a.due.localeCompare(b.due));
}

export function nextKinsenaWindows(fromIso: string): KinsenaWindow[] {
  return kinsenaWindowsAround(fromIso).filter((window) => window.due >= fromIso).slice(0, 2);
}

/** Local calendar day as YYYY-MM-DD (not UTC). */
export function todayIsoLocal(now = new Date()): string {
  return toIsoDay(now);
}

export type DueTodayLoanAlert = {
  id: string;
  person_name: string;
  loan_type: 'debt' | 'receivable';
  remaining_amount: number;
  reason: 'kinsena' | 'maturity' | 'overdue';
  label: string;
};

export type DueTodayAlerts = {
  today: string;
  kinsena: KinsenaWindow | null;
  items: DueTodayLoanAlert[];
};

function isOpenLoan(status: string): boolean {
  return status !== 'paid' && status !== 'cancelled';
}

/**
 * In-app due alerts for today:
 * - Kinsena (15th / month-end): all open loans
 * - Maturity: open loans whose due_date is today
 * - Overdue: open loans whose due_date is before today
 */
export function getDueTodayLoanAlerts(
  loans: Array<{
    id: string;
    person_name: string;
    loan_type: 'debt' | 'receivable';
    remaining_amount: number;
    due_date: string | null;
    status: string;
  }>,
  today = todayIsoLocal()
): DueTodayAlerts {
  const open = loans.filter(
    (loan) => isOpenLoan(loan.status) && Number(loan.remaining_amount) > 0
  );
  const kinsena = kinsenaWindowsAround(today).find((window) => window.due === today) ?? null;
  const byId = new Map<string, DueTodayLoanAlert>();

  const push = (item: DueTodayLoanAlert) => {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }
    const rank = { overdue: 3, maturity: 2, kinsena: 1 } as const;
    if (rank[item.reason] > rank[existing.reason]) {
      byId.set(item.id, item);
    }
  };

  for (const loan of open) {
    const due = loan.due_date?.trim() || null;
    if (due && due < today) {
      push({
        id: loan.id,
        person_name: loan.person_name,
        loan_type: loan.loan_type,
        remaining_amount: loan.remaining_amount,
        reason: 'overdue',
        label: `Past due ${due}`,
      });
    } else if (due && due === today) {
      push({
        id: loan.id,
        person_name: loan.person_name,
        loan_type: loan.loan_type,
        remaining_amount: loan.remaining_amount,
        reason: 'maturity',
        label: 'Matures today',
      });
    }
  }

  if (kinsena) {
    for (const loan of open) {
      push({
        id: loan.id,
        person_name: loan.person_name,
        loan_type: loan.loan_type,
        remaining_amount: loan.remaining_amount,
        reason: 'kinsena',
        label: `${kinsena.label} due today`,
      });
    }
  }

  const items = [...byId.values()].sort((a, b) => {
    const rank = { overdue: 0, maturity: 1, kinsena: 2 };
    if (rank[a.reason] !== rank[b.reason]) return rank[a.reason] - rank[b.reason];
    return a.person_name.localeCompare(b.person_name);
  });

  return { today, kinsena, items };
}

/** Late after the 5-day allowance from the 15th or month-end. Penalty is remaining × rate%. */
export function evaluateKinsenaPayment(
  paymentDate: string,
  remainingAmount: number,
  interestRatePercent: number
) {
  const windows = kinsenaWindowsAround(paymentDate);
  const due = [...windows].reverse().find((window) => window.due <= paymentDate) ?? null;
  if (!due) {
    return {
      late: false,
      penalty: 0,
      dueDate: null as string | null,
      graceEnds: null as string | null,
      periodLabel: null as string | null,
    };
  }
  const late = paymentDate > due.graceEnds;
  const rate =
    Number.isFinite(interestRatePercent) && interestRatePercent > 0 ? interestRatePercent : 0;
  const remaining = Number.isFinite(remainingAmount) && remainingAmount > 0 ? remainingAmount : 0;
  return {
    late,
    penalty: late ? roundMoney(remaining * (rate / 100)) : 0,
    dueDate: due.due,
    graceEnds: due.graceEnds,
    periodLabel: due.label,
  };
}

export type LoanPaymentSummary = {
  id: string;
  step: number;
  amount: number;
  paymentDate: string;
  method: string;
  late: boolean;
  statusLabel: string;
  periodLabel: string | null;
  dueDate: string | null;
  graceEnds: string | null;
  penalty: number;
  paidToDate: number;
  remainingAfter: number;
};

export function summarizeLoanPaymentNotes(
  payment: {
    amount: number;
    payment_date: string;
    payment_method?: string | null;
    notes?: string | null;
  }
) {
  const notes = payment.notes ?? '';
  const viaMatch = notes.match(/Via\s+([^.]+)\./i);
  const method = (payment.payment_method || viaMatch?.[1] || '').trim() || 'Cash';
  const late = /Late after/i.test(notes);
  const penaltyMatch = notes.match(/Penalty\s+([\d.]+)/i);
  const dueMatch = notes.match(/due\s+(\d{4}-\d{2}-\d{2})/i);
  const graceMatch = notes.match(/(?:grace until|until)\s+(\d{4}-\d{2}-\d{2})/i);
  const periodMatch =
    notes.match(/from the\s+([^(]+?)\s*\(/i) ||
    notes.match(/for the\s+([^(]+?)\s*\(/i) ||
    notes.match(/On time for\s+([^(]+?)\s*\(/i);
  return {
    method,
    late,
    statusLabel: late ? 'Late' : 'On time',
    periodLabel: periodMatch?.[1]?.trim() || null,
    dueDate: dueMatch?.[1] ?? null,
    graceEnds: graceMatch?.[1] ?? null,
    penalty: penaltyMatch ? Number(penaltyMatch[1]) || 0 : 0,
  };
}

export function loanPaymentTimeline(
  loan: { total_amount: number },
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method?: string | null;
    notes?: string | null;
    created_at?: string | null;
  }>
): LoanPaymentSummary[] {
  const ordered = [...payments].sort((a, b) => {
    if (a.payment_date !== b.payment_date) return a.payment_date.localeCompare(b.payment_date);
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });
  let paid = 0;
  return ordered.map((payment, index) => {
    paid = roundMoney(paid + payment.amount);
    const meta = summarizeLoanPaymentNotes(payment);
    return {
      id: payment.id,
      step: index + 1,
      amount: roundMoney(payment.amount),
      paymentDate: payment.payment_date,
      method: meta.method,
      late: meta.late,
      statusLabel: meta.statusLabel,
      periodLabel: meta.periodLabel,
      dueDate: meta.dueDate,
      graceEnds: meta.graceEnds,
      penalty: meta.penalty,
      paidToDate: paid,
      remainingAfter: roundMoney(Math.max(0, loan.total_amount - paid)),
    };
  });
}

export type BudgetSpendSummary = {
  id: string;
  step: number;
  amount: number;
  spendDate: string;
  category: string;
  method: string;
  description: string | null;
  spentToDate: number;
  remainingAfter: number;
  planTotal: number;
  overBudget: boolean;
};

export function budgetSpendTimeline(
  budget: { total_amount: number },
  spends: Array<{
    id: string;
    amount: number;
    transaction_date: string;
    category_name?: string | null;
    account_name?: string | null;
    description?: string | null;
    created_at?: string | null;
  }>
): BudgetSpendSummary[] {
  const ordered = [...spends].sort((a, b) => {
    if (a.transaction_date !== b.transaction_date) {
      return a.transaction_date.localeCompare(b.transaction_date);
    }
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });
  let spent = 0;
  return ordered.map((item, index) => {
    spent = roundMoney(spent + item.amount);
    const remaining = roundMoney(budget.total_amount - spent);
    return {
      id: item.id,
      step: index + 1,
      amount: roundMoney(item.amount),
      spendDate: item.transaction_date,
      category: (item.category_name ?? '').trim() || 'Uncategorized',
      method: (item.account_name ?? '').trim() || 'Cash',
      description: item.description?.trim() || null,
      spentToDate: spent,
      remainingAfter: Math.max(0, remaining),
      planTotal: roundMoney(budget.total_amount),
      overBudget: spent > budget.total_amount,
    };
  });
}
