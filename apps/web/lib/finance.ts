import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_ACCOUNTS,
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  buildBudgetStats,
  buildPeriodTrend,
  buildSpendingBreakdown,
  calculateLoanInterest,
  evaluateKinsenaPayment,
  formatCurrency,
  getDueTodayLoanAlerts,
  getReportPeriodRange,
  sortPaymentAccounts,
  type BudgetStat,
  type DailyTrendPoint,
  type ReportPeriod,
  type SpendingSlice,
} from '@perakita/shared';
import { supabase } from '@/lib/supabase';

export type WebAccount = {
  id: string;
  name: string;
  current_balance: number;
};

export type WebCategory = {
  id: string;
  name: string;
  type: 'income' | 'expense';
};

export type WebTransaction = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  notes: string | null;
  transaction_date: string;
  category_id: string | null;
  budget_id: string | null;
  account_id: string;
  created_at?: string;
};

export type WebLoanPayment = {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at?: string | null;
};

export { PAYMENT_METHODS, DEFAULT_PAYMENT_METHOD };

export type WebLoan = {
  id: string;
  person_name: string;
  loan_type: 'debt' | 'receivable';
  principal_amount: number;
  interest_rate: number;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  status: string;
  start_date: string | null;
  due_date: string | null;
};

export type WebBudget = {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  spent: number;
};

export function transactionKindLabel(type: string): string {
  switch (type) {
    case 'income':
      return 'Income';
    case 'expense':
      return 'Expense';
    case 'adjustment':
      return 'Budget spend (plan only)';
    case 'loan_received':
      return 'Borrowed / collected';
    case 'loan_given':
      return 'Lent';
    case 'loan_payment':
      return 'Loan payment';
    case 'debt_payment':
      return 'Debt payment';
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

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function adjustAccount(accountId: string, delta: number): Promise<void> {
  const now = new Date().toISOString();
  const { data: account, error } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', accountId)
    .single();
  if (error) throw error;
  const { error: updateError } = await supabase
    .from('accounts')
    .update({
      current_balance: num(account?.current_balance) + delta,
      updated_at: now,
      sync_status: 'updated',
    })
    .eq('id', accountId);
  if (updateError) throw updateError;
}

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function ensureFinanceDefaults(userId: string): Promise<void> {
  const now = new Date().toISOString();

  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (accountsError) throw accountsError;

  const existingNames = new Set((accounts ?? []).map((row) => String(row.name).toLowerCase()));
  const missing = DEFAULT_ACCOUNTS.filter((preset) => !existingNames.has(preset.name.toLowerCase()));
  for (const preset of missing) {
    const { error } = await supabase.from('accounts').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name: preset.name,
      type: preset.type,
      initial_balance: 0,
      current_balance: 0,
      currency: 'PHP',
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'synced',
      last_synced_at: now,
      version: 1,
    });
    if (!error) existingNames.add(preset.name.toLowerCase());
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .limit(1);
  if (categoriesError) throw categoriesError;

  if (!categories?.length) {
    const rows = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        name: cat.name,
        type: 'expense' as const,
        icon: cat.icon,
        color: cat.color,
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        sync_status: 'synced',
        last_synced_at: now,
        version: 1,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((cat) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        name: cat.name,
        type: 'income' as const,
        icon: cat.icon,
        color: cat.color,
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        sync_status: 'synced',
        last_synced_at: now,
        version: 1,
      })),
    ];
    const { error } = await supabase.from('categories').insert(rows);
    if (error) throw error;
  }
}

export async function loadDashboard(userId: string) {
  await ensureFinanceDefaults(userId);
  const { start, end } = monthRange();

  const [accountsRes, categoriesRes, txRes, loansRes, budgetsRes, monthTxRes, paymentsRes, balanceRes] =
    await Promise.all([
    supabase.from('accounts').select('id, name, current_balance').eq('user_id', userId).is('deleted_at', null),
    supabase.from('categories').select('id, name, type').eq('user_id', userId).is('deleted_at', null).order('name'),
    supabase
      .from('transactions')
      .select('id, type, amount, description, notes, transaction_date, category_id, budget_id, account_id, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('loans')
      .select(
        'id, person_name, loan_type, principal_amount, interest_rate, total_amount, amount_paid, remaining_amount, status, start_date, due_date'
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('budgets')
      .select('id, name, period_start, period_end, total_amount')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('period_start', { ascending: false }),
    supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('transaction_date', start)
      .lte('transaction_date', end),
    supabase
      .from('loan_payments')
      .select('id, loan_id, amount, payment_date, notes, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false }),
    supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('type', ['income', 'expense']),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (txRes.error) throw txRes.error;
  if (loansRes.error) throw loansRes.error;
  if (budgetsRes.error) throw budgetsRes.error;
  if (monthTxRes.error) throw monthTxRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (balanceRes.error) throw balanceRes.error;

  const accounts: WebAccount[] = sortPaymentAccounts(
    (accountsRes.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      current_balance: num(row.current_balance),
    }))
  );
  const categories: WebCategory[] = (categoriesRes.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: row.type as WebCategory['type'],
  }));
  const transactions: WebTransaction[] = (txRes.data ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as string,
    amount: num(row.amount),
    description: (row.description as string) ?? null,
    notes: (row.notes as string) ?? null,
    transaction_date: row.transaction_date as string,
    category_id: (row.category_id as string) ?? null,
    budget_id: (row.budget_id as string) ?? null,
    account_id: row.account_id as string,
    created_at: (row.created_at as string) ?? undefined,
  }));
  const loans: WebLoan[] = (loansRes.data ?? []).map((row) => ({
    id: row.id as string,
    person_name: row.person_name as string,
    loan_type: row.loan_type as WebLoan['loan_type'],
    principal_amount: num(row.principal_amount),
    interest_rate: num(row.interest_rate),
    total_amount: num(row.total_amount),
    amount_paid: num(row.amount_paid),
    remaining_amount: num(row.remaining_amount),
    status: row.status as string,
    start_date: (row.start_date as string) ?? null,
    due_date: (row.due_date as string) ?? null,
  }));

  const expenseRes = await supabase
    .from('transactions')
    .select('amount, transaction_date, budget_id')
    .eq('user_id', userId)
    .in('type', ['expense', 'adjustment'])
    .is('deleted_at', null);
  if (expenseRes.error) throw expenseRes.error;
  const expenseRows = expenseRes.data ?? [];

  const budgets: WebBudget[] = (budgetsRes.data ?? []).map((row) => {
    const periodStart = row.period_start as string;
    const periodEnd = row.period_end as string;
    const spent = expenseRows
      .filter((tx) => (tx.budget_id as string | null) === row.id)
      .reduce((sum, tx) => sum + num(tx.amount), 0);
    return {
      id: row.id as string,
      name: row.name as string,
      period_start: periodStart,
      period_end: periodEnd,
      total_amount: num(row.total_amount),
      spent,
    };
  });

  const payments: WebLoanPayment[] = (paymentsRes.data ?? []).map((row) => ({
    id: row.id as string,
    loan_id: row.loan_id as string,
    amount: num(row.amount),
    payment_date: row.payment_date as string,
    notes: (row.notes as string) ?? null,
    created_at: (row.created_at as string) ?? null,
  }));

  const balance = (balanceRes.data ?? []).reduce((sum, tx) => {
    if (tx.type === 'income') return sum + num(tx.amount);
    if (tx.type === 'expense') return sum - num(tx.amount);
    return sum;
  }, 0);
  const income = (monthTxRes.data ?? [])
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + num(tx.amount), 0);
  const expenses = (monthTxRes.data ?? [])
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + num(tx.amount), 0);

  return { accounts, categories, transactions, loans, budgets, payments, balance, income, expenses };
}

export type WebStatsDashboard = {
  balance: number;
  income: number;
  expenses: number;
  net: number;
  budgetSpend: number;
  monthLabel: string;
  period: ReportPeriod;
  transactionCount: number;
  spending: SpendingSlice[];
  dailyTrend: DailyTrendPoint[];
  budgets: BudgetStat[];
  loanDebts: number;
  loanReceivables: number;
  activeLoans: number;
  dueToday: ReturnType<typeof getDueTodayLoanAlerts>;
};

export async function loadStatsDashboard(
  userId: string,
  period: ReportPeriod = 'monthly'
): Promise<WebStatsDashboard> {
  const range = getReportPeriodRange(period);
  const { start, end, label: monthLabel } = range;

  const [
    monthTxRes,
    balanceRes,
    spendingRes,
    trendRes,
    budgetsRes,
    expenseRes,
    loansRes,
    txCountRes,
    budgetSpendRes,
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('transaction_date', start)
      .lte('transaction_date', end),
    supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('type', ['income', 'expense']),
    supabase
      .from('transactions')
      .select('amount, categories(name, color)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .is('deleted_at', null)
      .gte('transaction_date', start)
      .lte('transaction_date', end),
    supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('type', ['income', 'expense'])
      .gte('transaction_date', start)
      .lte('transaction_date', end),
    supabase
      .from('budgets')
      .select('id, name, period_start, period_end, total_amount')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('period_start', { ascending: false }),
    supabase
      .from('transactions')
      .select('amount, transaction_date, budget_id')
      .eq('user_id', userId)
      .in('type', ['expense', 'adjustment'])
      .is('deleted_at', null),
    supabase
      .from('loans')
      .select('id, person_name, remaining_amount, loan_type, status, due_date')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .in('type', ['expense', 'adjustment'])
      .not('budget_id', 'is', null)
      .gte('transaction_date', start)
      .lte('transaction_date', end),
  ]);

  if (monthTxRes.error) throw monthTxRes.error;
  if (balanceRes.error) throw balanceRes.error;
  if (spendingRes.error) throw spendingRes.error;
  if (trendRes.error) throw trendRes.error;
  if (budgetsRes.error) throw budgetsRes.error;
  if (expenseRes.error) throw expenseRes.error;
  if (loansRes.error) throw loansRes.error;
  if (txCountRes.error) throw txCountRes.error;
  if (budgetSpendRes.error) throw budgetSpendRes.error;

  const income = (monthTxRes.data ?? [])
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + num(tx.amount), 0);
  const expenses = (monthTxRes.data ?? [])
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + num(tx.amount), 0);
  const balance = (balanceRes.data ?? []).reduce((sum, tx) => {
    if (tx.type === 'income') return sum + num(tx.amount);
    if (tx.type === 'expense') return sum - num(tx.amount);
    return sum;
  }, 0);
  const budgetSpend = (budgetSpendRes.data ?? []).reduce((sum, tx) => sum + num(tx.amount), 0);

  const spendingMap = new Map<string, { name: string; color: string; total: number }>();
  for (const row of spendingRes.data ?? []) {
    const rawCategory = row.categories as
      | { name: string | null; color: string | null }
      | Array<{ name: string | null; color: string | null }>
      | null;
    const category = Array.isArray(rawCategory) ? rawCategory[0] ?? null : rawCategory;
    const key = category?.name ?? 'Uncategorized';
    const existing = spendingMap.get(key);
    const amount = num(row.amount);
    if (existing) {
      existing.total += amount;
    } else {
      spendingMap.set(key, {
        name: key,
        color: category?.color ?? '#94A3B8',
        total: amount,
      });
    }
  }
  const spendingRows = [...spendingMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ name: row.name, color: row.color, total: row.total }));

  const expenseRows = expenseRes.data ?? [];
  const budgets = buildBudgetStats(
    (budgetsRes.data ?? []).map((row) => {
      const spent = expenseRows
        .filter((tx) => (tx.budget_id as string | null) === row.id)
        .reduce((sum, tx) => sum + num(tx.amount), 0);
      return {
        id: row.id as string,
        name: row.name as string,
        total_amount: num(row.total_amount),
        spent,
      };
    })
  );

  const activeLoans = (loansRes.data ?? []).filter((loan) => loan.status !== 'cancelled');
  const loanDebts = activeLoans
    .filter((loan) => loan.loan_type === 'debt')
    .reduce((sum, loan) => sum + num(loan.remaining_amount), 0);
  const loanReceivables = activeLoans
    .filter((loan) => loan.loan_type === 'receivable')
    .reduce((sum, loan) => sum + num(loan.remaining_amount), 0);
  const dueToday = getDueTodayLoanAlerts(
    (loansRes.data ?? []).map((loan) => ({
      id: String(loan.id),
      person_name: String(loan.person_name ?? 'Loan'),
      loan_type: (loan.loan_type === 'receivable' ? 'receivable' : 'debt') as 'debt' | 'receivable',
      remaining_amount: num(loan.remaining_amount),
      due_date: (loan.due_date as string | null) ?? null,
      status: String(loan.status ?? 'active'),
    }))
  );

  return {
    balance,
    income,
    expenses,
    net: income - expenses,
    budgetSpend,
    monthLabel,
    period,
    transactionCount: txCountRes.count ?? 0,
    spending: buildSpendingBreakdown(spendingRows),
    dailyTrend: buildPeriodTrend(
      (trendRes.data ?? []).map((row) => ({
        transaction_date: row.transaction_date as string,
        type: row.type as string,
        amount: num(row.amount),
      })),
      range
    ),
    budgets,
    loanDebts,
    loanReceivables,
    activeLoans: activeLoans.length,
    dueToday,
  };
}

export async function createWebTransaction(input: {
  userId: string;
  accountId: string;
  categoryId: string | null;
  budgetId?: string | null;
  type: 'income' | 'expense' | 'adjustment';
  amount: number;
  description: string;
  date: string;
  notes?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const affectsBalance = input.type === 'income' || input.type === 'expense';
  let nextBalance: number | null = null;

  if (affectsBalance) {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', input.accountId)
      .single();
    if (accountError) throw accountError;
    nextBalance =
      num(account?.current_balance) + (input.type === 'income' ? input.amount : -input.amount);
  }

  const budgetId =
    input.type === 'expense' || input.type === 'adjustment' ? (input.budgetId ?? null) : null;

  const { error: txError } = await supabase.from('transactions').insert({
    id: crypto.randomUUID(),
    user_id: input.userId,
    account_id: input.accountId,
    category_id: input.categoryId,
    budget_id: budgetId,
    type: input.type,
    amount: input.amount,
    description: input.description || input.type,
    notes: input.notes ?? null,
    transaction_date: input.date,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    last_synced_at: now,
    version: 1,
  });
  if (txError) throw txError;

  if (nextBalance !== null) {
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ current_balance: nextBalance, updated_at: now, sync_status: 'updated' })
      .eq('id', input.accountId);
    if (updateError) throw updateError;
  }
}

/** Convert older budget-tab expenses (that hit Current Balance) into plan-only adjustments. */
export async function repairWebBudgetTrackSpends(userId: string): Promise<number> {
  const [{ data: budgets, error: budgetsError }, { data: txs, error: txError }] = await Promise.all([
    supabase
      .from('budgets')
      .select('id, name')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('transactions')
      .select('id, account_id, amount, budget_id, description, notes')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .is('deleted_at', null)
      .not('budget_id', 'is', null),
  ]);
  if (budgetsError) throw budgetsError;
  if (txError) throw txError;

  const budgetNameById = new Map(
    (budgets ?? []).map((b) => [b.id as string, (b.name as string) ?? ''])
  );
  const rows = (txs ?? []).filter((row) => {
    const notes = ((row.notes as string) ?? '').trim();
    if (notes.startsWith('Budget spend')) return true;
    // Web budget-tab spends used "Category · BudgetName" and had no notes.
    const budgetName = budgetNameById.get((row.budget_id as string) ?? '');
    if (!budgetName) return false;
    const description = ((row.description as string) ?? '').trim();
    return description.endsWith(` · ${budgetName}`) && !notes;
  });
  if (rows.length === 0) return 0;

  const now = new Date().toISOString();
  for (const row of rows) {
    const { error: updateTxError } = await supabase
      .from('transactions')
      .update({
        type: 'adjustment',
        notes: 'Budget track only — not from Current Balance',
        updated_at: now,
        sync_status: 'updated',
      })
      .eq('id', row.id);
    if (updateTxError) throw updateTxError;

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', row.account_id)
      .single();
    if (accountError) throw accountError;
    const { error: balError } = await supabase
      .from('accounts')
      .update({
        current_balance: num(account?.current_balance) + num(row.amount),
        updated_at: now,
        sync_status: 'updated',
      })
      .eq('id', row.account_id);
    if (balError) throw balError;
  }
  return rows.length;
}

export async function createWebPaymentMode(input: { userId: string; name: string }): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Enter a payment mode name.');
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const { error } = await supabase.from('accounts').insert({
    id,
    user_id: input.userId,
    name,
    type: 'other',
    initial_balance: 0,
    current_balance: 0,
    currency: 'PHP',
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    last_synced_at: now,
    version: 1,
  });
  if (error) throw error;
  return id;
}

export async function createWebLoan(input: {
  userId: string;
  accountId: string;
  personName: string;
  loanType: 'debt' | 'receivable';
  amount: number;
  interestRate?: number;
  startDate?: string;
  dueDate?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const startDate = input.startDate || now.slice(0, 10);
  const { principal, interestRate, total } = calculateLoanInterest(
    input.amount,
    input.interestRate ?? 0,
    { startDate, dueDate: input.dueDate }
  );
  const { error } = await supabase.from('loans').insert({
    id,
    user_id: input.userId,
    person_name: input.personName,
    loan_type: input.loanType,
    principal_amount: principal,
    interest_rate: interestRate,
    total_amount: total,
    amount_paid: 0,
    remaining_amount: total,
    start_date: startDate,
    due_date: input.dueDate || null,
    payment_frequency: 'kinsena',
    status: 'active',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    version: 1,
  });
  if (error) throw error;

  const txType = input.loanType === 'debt' ? 'loan_received' : 'loan_given';
  const { error: txError } = await supabase.from('transactions').insert({
    id: crypto.randomUUID(),
    user_id: input.userId,
    account_id: input.accountId,
    category_id: null,
    type: txType,
    amount: principal,
    description:
      input.loanType === 'debt'
        ? `Borrowed from ${input.personName}`
        : `Lent to ${input.personName}`,
    notes: 'Loan record — not included in current balance',
    transaction_date: startDate,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    last_synced_at: now,
    version: 1,
  });
  if (txError) throw txError;
}

export async function recordWebLoanPayment(input: {
  userId: string;
  loan: WebLoan;
  accountId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
}): Promise<void> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Enter a payment greater than zero.');
  }
  const paymentDate = input.paymentDate || new Date().toISOString().slice(0, 10);
  const method = input.paymentMethod?.trim() || DEFAULT_PAYMENT_METHOD;
  const kinsena = evaluateKinsenaPayment(
    paymentDate,
    input.loan.remaining_amount,
    input.loan.interest_rate
  );
  const penalty = kinsena.penalty;
  const billedTotal = input.loan.total_amount + penalty;
  const remainingAfterPenalty = input.loan.remaining_amount + penalty;
  const payment = Math.min(input.amount, remainingAfterPenalty);
  const now = new Date().toISOString();
  const nextPaid = Math.min(billedTotal, input.loan.amount_paid + payment);
  const remaining = Math.max(0, billedTotal - nextPaid);
  const status = remaining <= 0 ? 'paid' : nextPaid > 0 ? 'partially_paid' : 'active';
  const notes = kinsena.late
    ? `Via ${method}. Paid ${payment} on ${paymentDate}. Late after 5-day allowance from ${kinsena.periodLabel} (due ${kinsena.dueDate}, grace until ${kinsena.graceEnds}). Penalty ${penalty} at ${input.loan.interest_rate}%.`
    : `Via ${method}. Paid ${payment} on ${paymentDate}. On time for ${kinsena.periodLabel ?? 'kinsena'} (due ${kinsena.dueDate ?? 'n/a'}, grace until ${kinsena.graceEnds ?? 'n/a'}).`;

  const { error } = await supabase
    .from('loans')
    .update({
      total_amount: billedTotal,
      amount_paid: nextPaid,
      remaining_amount: remaining,
      status,
      updated_at: now,
      sync_status: 'updated',
    })
    .eq('id', input.loan.id);
  if (error) throw error;

  const { error: payError } = await supabase.from('loan_payments').insert({
    id: crypto.randomUUID(),
    user_id: input.userId,
    loan_id: input.loan.id,
    amount: payment,
    payment_date: paymentDate,
    notes,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    version: 1,
  });
  if (payError) throw payError;

  const txType = input.loan.loan_type === 'debt' ? 'debt_payment' : 'loan_received';
  const { error: txError } = await supabase.from('transactions').insert({
    id: crypto.randomUUID(),
    user_id: input.userId,
    account_id: input.accountId,
    category_id: null,
    type: txType,
    amount: payment,
    description:
      input.loan.loan_type === 'debt'
        ? `Paid ${input.loan.person_name} via ${method}`
        : `Collected from ${input.loan.person_name} via ${method}`,
    notes,
    transaction_date: paymentDate,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    last_synced_at: now,
    version: 1,
  });
  if (txError) throw txError;
}

export async function createWebBudget(input: {
  userId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('budgets').insert({
    id: crypto.randomUUID(),
    user_id: input.userId,
    name: input.name,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    total_amount: input.totalAmount,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'synced',
    version: 1,
  });
  if (error) throw error;
}

export async function updateWebBudget(budgetId: string, totalAmount: number): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('budgets')
    .update({ total_amount: totalAmount, updated_at: now, sync_status: 'updated' })
    .eq('id', budgetId);
  if (error) throw error;
}

export async function deleteWebBudget(budgetId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('budgets')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('id', budgetId);
  if (error) throw error;
}

export async function deleteWebLoan(loanId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('loans')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('id', loanId);
  if (error) throw error;
}

export async function deleteWebIncome(tx: WebTransaction): Promise<void> {
  if (tx.type !== 'income') throw new Error('Only income can be deleted here.');
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('id', tx.id);
  if (error) throw error;
  await adjustAccount(tx.account_id, -tx.amount);
}

async function resetUserAccountBalances(userId: string, now: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({
      current_balance: 0,
      initial_balance: 0,
      updated_at: now,
      sync_status: 'updated',
    })
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (error) throw error;
}

/** Soft-delete income & expense rows and zero payment-mode balances. */
export async function resetWebCurrentBalance(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('user_id', userId)
    .in('type', ['income', 'expense'])
    .is('deleted_at', null);
  if (error) throw error;
  await resetUserAccountBalances(userId, now);
}

/** Soft-delete loans, budgets, expenses/income, and related payments; zero balances. */
export async function clearWebFinanceData(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error: txError } = await supabase
    .from('transactions')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (txError) throw txError;

  const { error: paymentError } = await supabase
    .from('loan_payments')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (paymentError) throw paymentError;

  const { error: loanError } = await supabase
    .from('loans')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (loanError) throw loanError;

  const { error: budgetCatError } = await supabase
    .from('budget_categories')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (budgetCatError) throw budgetCatError;

  const { error: budgetError } = await supabase
    .from('budgets')
    .update({ deleted_at: now, updated_at: now, sync_status: 'deleted' })
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (budgetError) throw budgetError;

  await resetUserAccountBalances(userId, now);
}

export { formatCurrency };
