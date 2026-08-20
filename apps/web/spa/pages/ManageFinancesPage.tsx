'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  APP_CREDIT,
  calculateLoanInterest,
  budgetSpendTimeline,
  evaluateKinsenaPayment,
  loanPaymentTimeline,
  nextKinsenaWindows,
} from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { PaymentModeChips } from '@/components/PaymentModeChips';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/spa/AuthProvider';
import {
  createWebBudget,
  createWebLoan,
  createWebPaymentMode,
  createWebTransaction,
  deleteWebBudget,
  deleteWebIncome,
  deleteWebLoan,
  formatCurrency,
  loadDashboard,
  recordWebLoanPayment,
  signedTransactionAmount,
  transactionKindLabel,
  updateWebBudget,
  type WebAccount,
  type WebBudget,
  type WebCategory,
  type WebLoan,
  type WebLoanPayment,
  type WebTransaction,
} from '@/lib/finance';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOtherCategory(name?: string | null): boolean {
  return (name ?? '').trim().toLowerCase() === 'other';
}

function monthRange(): { name: string; start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    name: `${now.toLocaleString('en-PH', { month: 'long', year: 'numeric' })} budget`,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function ManageFinancesPage() {
  const { user } = useAuth();
  const notify = useToast();
  const name = user?.email?.split('@')[0] ?? 'there';
  const month = monthRange();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [accounts, setAccounts] = useState<WebAccount[]>([]);
  const [categories, setCategories] = useState<WebCategory[]>([]);
  const [transactions, setTransactions] = useState<WebTransaction[]>([]);
  const [loans, setLoans] = useState<WebLoan[]>([]);
  const [payments, setPayments] = useState<WebLoanPayment[]>([]);
  const [budgets, setBudgets] = useState<WebBudget[]>([]);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [loanType, setLoanType] = useState<'debt' | 'receivable'>('debt');
  const [loanPerson, setLoanPerson] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanInterest, setLoanInterest] = useState('');
  const [loanFrom, setLoanFrom] = useState(today());
  const [loanDue, setLoanDue] = useState('');
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [payDates, setPayDates] = useState<Record<string, string>>({});
  const [payAccountIds, setPayAccountIds] = useState<Record<string, string>>({});
  const [newPaymentMode, setNewPaymentMode] = useState('');
  const [spendAmounts, setSpendAmounts] = useState<Record<string, string>>({});
  const [spendCategories, setSpendCategories] = useState<Record<string, string>>({});
  const [spendNotes, setSpendNotes] = useState<Record<string, string>>({});
  const [spendDates, setSpendDates] = useState<Record<string, string>>({});
  const [spendAccountIds, setSpendAccountIds] = useState<Record<string, string>>({});
  const [budgetCaps, setBudgetCaps] = useState<Record<string, string>>({});

  const [budgetName, setBudgetName] = useState(month.name);
  const [budgetTotal, setBudgetTotal] = useState('');
  const [budgetStart, setBudgetStart] = useState(month.start);
  const [budgetEnd, setBudgetEnd] = useState(month.end);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type]
  );
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  );
  const selectedFormCategory = useMemo(
    () => visibleCategories.find((category) => category.id === categoryId),
    [visibleCategories, categoryId]
  );
  const otherCategorySelected = isOtherCategory(selectedFormCategory?.name);
  const kinsenaUpcoming = useMemo(() => nextKinsenaWindows(today()), []);

  const loanBreakdown = useMemo(
    () =>
      calculateLoanInterest(
        Number(loanAmount.replace(/,/g, '').trim()) || 0,
        Number(loanInterest.replace(/,/g, '').trim()) || 0,
        { startDate: loanFrom, dueDate: loanDue }
      ),
    [loanAmount, loanInterest, loanFrom, loanDue]
  );

  async function refresh(userId: string) {
    const data = await loadDashboard(userId);
    setAccounts(data.accounts);
    setCategories(data.categories);
    setTransactions(data.transactions);
    setLoans(data.loans);
    setPayments(data.payments);
    setBudgets(data.budgets);
    setBalance(data.balance);
    setIncome(data.income);
    setExpenses(data.expenses);
    setAccountId((current) => current || data.accounts[0]?.id || '');
  }

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoading(true);
    loadDashboard(user.id)
      .then((data) => {
        if (!active) return;
        setAccounts(data.accounts);
        setCategories(data.categories);
        setTransactions(data.transactions);
        setLoans(data.loans);
        setPayments(data.payments);
        setBudgets(data.budgets);
        setBalance(data.balance);
        setIncome(data.income);
        setExpenses(data.expenses);
        setAccountId(data.accounts[0]?.id ?? '');
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load your finances.');
        notify.error(err instanceof Error ? err.message : 'Could not load your finances.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (type !== 'income') {
      setCategoryId('');
      return;
    }
    const salary =
      categories.find((category) => category.type === 'income' && category.name === 'Salary') ??
      categories.find((category) => category.type === 'income');
    setCategoryId(salary?.id ?? '');
  }, [type, categories]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;
    const parsed = Number(amount.replace(/,/g, '').trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter an amount greater than zero.');
      return;
    }
    if (!accountId) {
      notify.error('Choose a payment mode.');
      return;
    }
    const selectedCategory = categories.find((item) => item.id === categoryId);
    if (isOtherCategory(selectedCategory?.name) && !description.trim()) {
      notify.error(
        type === 'income' ? 'Describe this other income.' : 'Describe where the money went.'
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createWebTransaction({
        userId: user.id,
        accountId,
        categoryId: categoryId || null,
        type,
        amount: parsed,
        description: description.trim() || selectedCategory?.name || '',
        date: date || today(),
      });
      setAmount('');
      setDescription('');
      await refresh(user.id);
      notify.success(type === 'income' ? 'Income saved' : 'Expense saved');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save this transaction.');
    } finally {
      setSaving(false);
    }
  };

  const onLoan = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;
    const parsed = Number(loanAmount.replace(/,/g, '').trim());
    const rate = loanInterest.trim() === '' ? 0 : Number(loanInterest.replace(/,/g, '').trim());
    if (!loanPerson.trim()) {
      notify.error('Enter the person’s name for this loan.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a loan amount greater than zero.');
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      notify.error('Enter 0 or an interest percentage like 5 for 5% per month.');
      return;
    }
    if (!loanFrom) {
      notify.error('Pick the start date for this loan.');
      return;
    }
    if (rate > 0 && !loanDue) {
      notify.error('Pick a due date so interest can be calculated from start to due.');
      return;
    }
    if (loanDue && loanDue < loanFrom) {
      notify.error('Due date must be on or after the start date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createWebLoan({
        userId: user.id,
        accountId,
        personName: loanPerson.trim(),
        loanType,
        amount: parsed,
        interestRate: rate,
        startDate: loanFrom,
        dueDate: loanDue,
      });
      setLoanPerson('');
      setLoanAmount('');
      setLoanInterest('');
      setLoanFrom(today());
      setLoanDue('');
      await refresh(user.id);
      notify.success('Loan saved');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save this loan.');
    } finally {
      setSaving(false);
    }
  };

  const onPayLoan = async (loan: WebLoan) => {
    if (!user?.id) return;
    const parsed = Number((payAmounts[loan.id] ?? '').replace(/,/g, '').trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a payment amount greater than zero.');
      return;
    }
    const modeId = payAccountIds[loan.id] || accountId;
    if (!modeId) {
      notify.error('Choose a payment mode.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordWebLoanPayment({
        userId: user.id,
        loan,
        accountId: modeId,
        amount: parsed,
        paymentDate: payDates[loan.id] || today(),
        paymentMethod: accounts.find((account) => account.id === modeId)?.name || 'Cash',
      });
      setPayAmounts((current) => ({ ...current, [loan.id]: '' }));
      await refresh(user.id);
      notify.success('Payment recorded');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save this payment.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteIncome = async (tx: WebTransaction) => {
    if (!user?.id) return;
    if (!window.confirm('Delete this income? It will be subtracted from Current Balance.')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteWebIncome(tx);
      await refresh(user.id);
      notify.deleted('Income deleted');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not delete this income.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteLoan = async (loan: WebLoan) => {
    if (!user?.id) return;
    if (!window.confirm(`Delete loan with ${loan.person_name}? Current Balance is not changed.`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteWebLoan(loan.id);
      await refresh(user.id);
      notify.deleted('Loan deleted');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not delete this loan.');
    } finally {
      setSaving(false);
    }
  };

  const onSpendBudget = async (budget: WebBudget) => {
    if (!user?.id) return;
    const parsed = Number((spendAmounts[budget.id] ?? '').replace(/,/g, '').trim());
    const categoryIdForSpend = spendCategories[budget.id];
    if (!categoryIdForSpend) {
      notify.error('Pick where the money went.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a spend amount greater than zero.');
      return;
    }
    const modeId = spendAccountIds[budget.id] || accountId;
    if (!modeId) {
      notify.error('Choose a payment mode.');
      return;
    }
    const category = categories.find((item) => item.id === categoryIdForSpend);
    const otherNote = (spendNotes[budget.id] ?? '').trim();
    if (isOtherCategory(category?.name) && !otherNote) {
      notify.error('Describe where the money went.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createWebTransaction({
        userId: user.id,
        accountId: modeId,
        categoryId: categoryIdForSpend,
        type: 'expense',
        amount: parsed,
        description: isOtherCategory(category?.name)
          ? `${otherNote} · ${budget.name}`
          : category
            ? `${category.name} · ${budget.name}`
            : budget.name,
        date: spendDates[budget.id] || today(),
      });
      setSpendAmounts((current) => ({ ...current, [budget.id]: '' }));
      setSpendNotes((current) => ({ ...current, [budget.id]: '' }));
      await refresh(user.id);
      notify.success('Spend saved and subtracted from budget');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not record this spend.');
    } finally {
      setSaving(false);
    }
  };

  const onUpdateBudget = async (budget: WebBudget) => {
    if (!user?.id) return;
    const parsed = Number((budgetCaps[budget.id] ?? String(budget.total_amount)).replace(/,/g, '').trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a new budget cap greater than zero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWebBudget(budget.id, parsed);
      await refresh(user.id);
      notify.info('Budget updated');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not update this budget.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteBudget = async (budget: WebBudget) => {
    if (!user?.id) return;
    if (!window.confirm(`Delete budget ${budget.name}? Expenses stay in your log.`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteWebBudget(budget.id);
      await refresh(user.id);
      notify.deleted('Budget deleted');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not delete this budget.');
    } finally {
      setSaving(false);
    }
  };

  const onBudget = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;
    const parsed = Number(budgetTotal.replace(/,/g, '').trim());
    if (!budgetName.trim()) {
      notify.error('Give this budget a name.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error('Enter a spending limit greater than zero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createWebBudget({
        userId: user.id,
        name: budgetName.trim(),
        periodStart: budgetStart,
        periodEnd: budgetEnd,
        totalAmount: parsed,
      });
      setBudgetTotal('');
      await refresh(user.id);
      notify.success('Budget saved');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save this budget.');
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Current Balance', value: balance, tone: 'text-[var(--foreground)]' },
    { label: 'Income This Month', value: income, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Expenses This Month', value: expenses, tone: 'text-red-500' },
  ];

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Manage finances</h1>
            <p className="mt-1 text-[var(--muted)]">Add and edit transactions, loans, and budgets.</p>
          </div>
          <Link
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)]"
            to="/dashboard"
          >
            View dashboard
          </Link>
        </div>
        <p className="mt-2 text-[var(--muted)]">
          Current Balance is income minus expenses only. Loan debts stay in Loans.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark"
            >
              <p className="text-sm text-[var(--muted)]">{stat.label}</p>
              <p className={`mt-2 text-3xl font-extrabold tabular-nums ${stat.tone}`}>
                {loading ? '—' : formatCurrency(stat.value)}
              </p>
              {stat.label === 'Current Balance' ? (
                <p className="mt-1 text-xs text-[var(--muted)]">Does not include loans.</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <form
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark"
            onSubmit={(event) => void onSubmit(event)}
          >
            <h2 className="text-lg font-bold">
              {type === 'income' ? 'Add income' : 'Add expense'}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {type === 'income'
                ? 'Money you received — salary, freelance, allowance, or other income. Added to the account you pick.'
                : 'Money you spent. Borrowed or lent cash belongs in Loans, not income.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map((value) => (
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    type === value
                      ? 'border-primary bg-primary text-white'
                      : 'border-[var(--border)]'
                  }`}
                  key={value}
                  onClick={() => setType(value)}
                  type="button"
                >
                  {value === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium">
              {type === 'income' ? 'Income amount (PHP)' : 'Expense amount (PHP)'}
              <input
                className="auth-input mt-1"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                value={amount}
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Date
              <input
                className="auth-input mt-1"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Payment mode
              <div className="mt-2">
                <PaymentModeChips accounts={accounts} onChange={setAccountId} value={accountId} />
              </div>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                className="auth-input"
                onChange={(event) => setNewPaymentMode(event.target.value)}
                placeholder="Add GCash, Palawan, etc."
                value={newPaymentMode}
              />
              <button
                className="shrink-0 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    if (!user?.id || !newPaymentMode.trim()) {
                      notify.error('Enter a payment mode name.');
                      return;
                    }
                    setSaving(true);
                    setError(null);
                    try {
                      const id = await createWebPaymentMode({
                        userId: user.id,
                        name: newPaymentMode.trim(),
                      });
                      setNewPaymentMode('');
                      await refresh(user.id);
                      setAccountId(id);
                      notify.success('Payment mode saved');
                    } catch (err) {
                      notify.error(err instanceof Error ? err.message : 'Could not add payment mode.');
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
                type="button"
              >
                Add
              </button>
            </div>
            <label className="mt-4 block text-sm font-medium">
              {type === 'income' ? 'Income type' : 'Where did the money go?'}
              <select
                className="auth-input mt-1"
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setDescription('');
                }}
                value={categoryId}
              >
                {type === 'expense' ? <option value="">Uncategorized</option> : null}
                {visibleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            {type === 'income' || otherCategorySelected ? (
              <label className="mt-4 block text-sm font-medium">
                {otherCategorySelected
                  ? type === 'income'
                    ? 'Describe this other income'
                    : 'Describe where the money went'
                  : 'Income source'}
                <input
                  className="auth-input mt-1"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    otherCategorySelected
                      ? 'e.g. Hardware, pasalubong, donation'
                      : 'e.g. Monthly salary, freelance client'
                  }
                  value={description}
                />
              </label>
            ) : null}
            <button className="auth-button mt-6 min-h-12" disabled={saving || loading} type="submit">
              {saving ? 'Saving…' : type === 'income' ? 'Save income' : 'Save expense'}
            </button>
          </form>

          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
            <h2 className="text-lg font-bold">Transaction log</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              History of every income, expense, loan, and payment you saved.
            </p>
            {loading ? (
              <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>
            ) : transactions.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                No transactions yet. Add income, an expense, or a loan to see it here.
              </p>
            ) : (
              <ul className="mt-4 max-h-[32rem] divide-y divide-[var(--border)] overflow-auto">
                {transactions.map((tx) => {
                  const category = categories.find((item) => item.id === tx.category_id);
                  const signed = signedTransactionAmount(tx.type, tx.amount);
                  return (
                    <li className="flex items-center justify-between gap-3 py-3" key={tx.id}>
                      <div>
                        <p className="font-semibold">
                          {tx.description || category?.name || transactionKindLabel(tx.type)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {transactionKindLabel(tx.type)}
                          {category?.name ? ` · ${category.name}` : ''} · {tx.transaction_date}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p
                          className={`font-bold tabular-nums ${
                            signed < 0 ? 'text-red-500' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(signed, { showSign: true })}
                        </p>
                        {tx.type === 'income' ? (
                          <button
                            className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-semibold"
                            disabled={saving}
                            onClick={() => void onDeleteIncome(tx)}
                            type="button"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
            <h2 className="text-lg font-bold">Loans</h2>
            <form className="mt-4 space-y-3" onSubmit={(event) => void onLoan(event)}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    loanType === 'debt' ? 'border-primary bg-primary text-white' : 'border-[var(--border)]'
                  }`}
                  onClick={() => setLoanType('debt')}
                  type="button"
                >
                  I borrowed
                </button>
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    loanType === 'receivable'
                      ? 'border-primary bg-primary text-white'
                      : 'border-[var(--border)]'
                  }`}
                  onClick={() => setLoanType('receivable')}
                  type="button"
                >
                  I lent
                </button>
              </div>
              <p className="text-sm text-[var(--muted)]">
                {loanType === 'debt'
                  ? 'Debt record only — it is not added to Current Balance. Pay every 15th and month-end, with 5 days allowance before interest penalty.'
                  : 'Loan record only — it is not added to Current Balance. Collect every 15th and month-end, with 5 days allowance before interest penalty.'}
              </p>
              <input
                className="auth-input"
                onChange={(event) => setLoanPerson(event.target.value)}
                placeholder={loanType === 'debt' ? 'Who did you borrow from?' : 'Who did you lend to?'}
                value={loanPerson}
              />
              <input
                className="auth-input"
                inputMode="decimal"
                onChange={(event) => setLoanAmount(event.target.value)}
                placeholder={loanType === 'debt' ? 'Principal borrowed (PHP)' : 'Principal lent (PHP)'}
                value={loanAmount}
              />
              <input
                className="auth-input"
                inputMode="decimal"
                onChange={(event) => setLoanInterest(event.target.value)}
                placeholder="Interest per month (%)"
                value={loanInterest}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm font-medium">
                  From
                  <input
                    className="auth-input mt-1"
                    onChange={(event) => {
                      setLoanFrom(event.target.value);
                      if (loanDue && loanDue < event.target.value) setLoanDue('');
                    }}
                    type="date"
                    value={loanFrom}
                  />
                </label>
                <label className="text-sm font-medium">
                  Due date
                  <input
                    className="auth-input mt-1"
                    min={loanFrom}
                    onChange={(event) => setLoanDue(event.target.value)}
                    type="date"
                    value={loanDue}
                  />
                </label>
              </div>
              {loanBreakdown.principal > 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  {loanDue
                    ? `${loanBreakdown.days} days (${loanBreakdown.months} months) × ${loanBreakdown.interestRate}% per month = ${formatCurrency(loanBreakdown.interest)} interest. Total to ${loanType === 'debt' ? 'pay back' : 'collect'}: ${formatCurrency(loanBreakdown.total)}.`
                    : 'Pick a due date to calculate interest from the start date.'}
                </p>
              ) : null}
              <button className="auth-button min-h-12" disabled={saving || loading} type="submit">
                Save loan
              </button>
            </form>
            <ul className="mt-6 divide-y divide-[var(--border)]">
              {loans.length === 0 ? (
                <li className="py-3 text-sm text-[var(--muted)]">No loans yet.</li>
              ) : (
                loans.map((loan) => {
                  const paymentDate = payDates[loan.id] || today();
                  const kinsena = evaluateKinsenaPayment(
                    paymentDate,
                    loan.remaining_amount,
                    loan.interest_rate
                  );
                  const logs = payments.filter((item) => item.loan_id === loan.id);
                  const timeline = loanPaymentTimeline(loan, logs);
                  const percent =
                    loan.total_amount > 0
                      ? Math.min(100, Math.round((loan.amount_paid / loan.total_amount) * 100))
                      : 0;
                  const modeId = payAccountIds[loan.id] || accountId;
                  return (
                  <li className="py-4" key={loan.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{loan.person_name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {loan.loan_type === 'debt' ? 'You borrowed' : 'You lent'}
                          {loan.interest_rate > 0
                            ? ` · ${loan.interest_rate}% per month (${formatCurrency(loan.total_amount - loan.principal_amount)})`
                            : ' · no interest'}
                          {loan.start_date && loan.due_date
                            ? ` · ${loan.start_date} → ${loan.due_date}`
                            : ''}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Remaining {formatCurrency(loan.remaining_amount)} of {formatCurrency(loan.total_amount)} · paid {formatCurrency(loan.amount_paid)} ({percent}%)
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Kinsena: 15th and month-end
                          {kinsenaUpcoming[0]
                            ? ` · next due ${kinsenaUpcoming[0].due}, pay until ${kinsenaUpcoming[0].graceEnds}`
                            : ''}
                        </p>
                      </div>
                      <button
                        className="shrink-0 rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-semibold"
                        disabled={saving}
                        onClick={() => void onDeleteLoan(loan)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className={`h-2 ${loan.status === 'paid' ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                      Payment flow
                    </p>
                    {timeline.length === 0 ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">No payments yet. Record the first one below.</p>
                    ) : (
                      <ol className="mt-2 space-y-2">
                        {timeline.map((item) => (
                          <li
                            className="rounded-2xl border border-[var(--border)] bg-[var(--input)] px-3 py-3"
                            key={item.id}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                                  Payment {item.step}
                                </p>
                                <p className="text-base font-bold">{formatCurrency(item.amount)}</p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  item.late
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                              >
                                {item.statusLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {item.paymentDate} · via {item.method}
                            </p>
                            {item.periodLabel ? (
                              <p className="text-xs text-[var(--muted)]">
                                {item.periodLabel}
                                {item.dueDate ? ` · due ${item.dueDate}` : ''}
                                {item.graceEnds ? ` · grace until ${item.graceEnds}` : ''}
                              </p>
                            ) : null}
                            {item.late && item.penalty > 0 ? (
                              <p className="text-xs text-red-600">Penalty {formatCurrency(item.penalty)}</p>
                            ) : null}
                            <p className="text-xs text-[var(--muted)]">
                              Paid to date {formatCurrency(item.paidToDate)} · remaining {formatCurrency(item.remainingAfter)}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                    {loan.status !== 'paid' ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                          Record next payment
                        </p>
                        <PaymentModeChips
                          accounts={accounts}
                          onChange={(id) =>
                            setPayAccountIds((current) => ({ ...current, [loan.id]: id }))
                          }
                          value={modeId}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            className="auth-input"
                            inputMode="decimal"
                            onChange={(event) =>
                              setPayAmounts((current) => ({ ...current, [loan.id]: event.target.value }))
                            }
                            placeholder="Amount paying"
                            value={payAmounts[loan.id] ?? ''}
                          />
                          <input
                            className="auth-input"
                            onChange={(event) =>
                              setPayDates((current) => ({ ...current, [loan.id]: event.target.value }))
                            }
                            type="date"
                            value={paymentDate}
                          />
                          <button
                            className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold"
                            disabled={saving}
                            onClick={() => void onPayLoan(loan)}
                            type="button"
                          >
                            Record
                          </button>
                        </div>
                        <p className={`text-xs ${kinsena.late ? 'text-red-600' : 'text-[var(--muted)]'}`}>
                          {kinsena.late
                            ? `Late after the 5-day allowance from the ${kinsena.periodLabel}. Penalty ${formatCurrency(kinsena.penalty)}.`
                            : `Within 5-day allowance for the ${kinsena.periodLabel} (due ${kinsena.dueDate}, until ${kinsena.graceEnds}).`}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-600">Paid in full</p>
                    )}
                  </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
            <h2 className="text-lg font-bold">Budgets</h2>
            <form className="mt-4 space-y-3" onSubmit={(event) => void onBudget(event)}>
              <input
                className="auth-input"
                onChange={(event) => setBudgetName(event.target.value)}
                placeholder="Budget name"
                value={budgetName}
              />
              <input
                className="auth-input"
                inputMode="decimal"
                onChange={(event) => setBudgetTotal(event.target.value)}
                placeholder="Total spending limit (PHP)"
                value={budgetTotal}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="auth-input"
                  onChange={(event) => setBudgetStart(event.target.value)}
                  type="date"
                  value={budgetStart}
                />
                <input
                  className="auth-input"
                  onChange={(event) => setBudgetEnd(event.target.value)}
                  type="date"
                  value={budgetEnd}
                />
              </div>
              <button className="auth-button min-h-12" disabled={saving || loading} type="submit">
                Save budget
              </button>
            </form>
            <ul className="mt-6 divide-y divide-[var(--border)]">
              {budgets.length === 0 ? (
                <li className="py-3 text-sm text-[var(--muted)]">No budgets yet.</li>
              ) : (
                budgets.map((budget) => {
                  const percent =
                    budget.total_amount > 0
                      ? Math.min(100, Math.round((budget.spent / budget.total_amount) * 100))
                      : 0;
                  const over = budget.spent > budget.total_amount;
                  const remaining = Math.max(0, budget.total_amount - budget.spent);
                  const modeId = spendAccountIds[budget.id] || accountId;
                  const timeline = budgetSpendTimeline(
                    budget,
                    transactions
                      .filter(
                        (tx) =>
                          tx.type === 'expense' &&
                          tx.transaction_date >= budget.period_start &&
                          tx.transaction_date <= budget.period_end
                      )
                      .map((tx) => ({
                        id: tx.id,
                        amount: tx.amount,
                        transaction_date: tx.transaction_date,
                        category_name: categories.find((item) => item.id === tx.category_id)?.name ?? null,
                        account_name: accounts.find((item) => item.id === tx.account_id)?.name ?? null,
                        description: tx.description,
                        created_at: tx.created_at ?? null,
                      }))
                  );
                  return (
                    <li className="py-4" key={budget.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                            1. Budget
                          </p>
                          <p className="font-semibold">{budget.name}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {budget.period_start} → {budget.period_end}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Spent {formatCurrency(budget.spent)} of {formatCurrency(budget.total_amount)}
                            {over ? ' · over budget' : ` · ${formatCurrency(remaining)} left`}
                            {' · '}
                            {percent}%
                          </p>
                        </div>
                        <button
                          className="shrink-0 rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-semibold"
                          disabled={saving}
                          onClick={() => void onDeleteBudget(budget)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className={`h-2 ${over ? 'bg-red-500' : 'bg-primary'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                        2. Spend flow
                      </p>
                      {timeline.length === 0 ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          No spend yet. Record the first one below.
                        </p>
                      ) : (
                        <ol className="mt-2 space-y-2">
                          {timeline.map((item) => (
                            <li
                              className="rounded-2xl border border-[var(--border)] bg-[var(--input)] px-3 py-3"
                              key={item.id}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                                    Spend {item.step}
                                  </p>
                                  <p className="text-base font-bold">{formatCurrency(item.amount)}</p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    item.overBudget
                                      ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  }`}
                                >
                                  {item.overBudget ? 'Over budget' : 'Within budget'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {item.spendDate} · {item.category} · via {item.method}
                              </p>
                              {item.description ? (
                                <p className="text-xs text-[var(--muted)]">{item.description}</p>
                              ) : null}
                              <p className="text-xs text-[var(--muted)]">
                                Spent to date {formatCurrency(item.spentToDate)} · remaining{' '}
                                {formatCurrency(item.remainingAfter)}
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                          3. Record next spend
                        </p>
                        <p className="text-xs font-medium">Where did the money go?</p>
                        <PaymentModeChips
                          accounts={expenseCategories}
                          onChange={(id) => {
                            setSpendCategories((current) => ({ ...current, [budget.id]: id }));
                            const nextName = expenseCategories.find((category) => category.id === id)?.name;
                            if (!isOtherCategory(nextName)) {
                              setSpendNotes((current) => ({ ...current, [budget.id]: '' }));
                            }
                          }}
                          value={spendCategories[budget.id] ?? ''}
                        />
                        {isOtherCategory(
                          expenseCategories.find((category) => category.id === spendCategories[budget.id])
                            ?.name
                        ) ? (
                          <input
                            className="auth-input"
                            onChange={(event) =>
                              setSpendNotes((current) => ({
                                ...current,
                                [budget.id]: event.target.value,
                              }))
                            }
                            placeholder="Describe where the money went"
                            value={spendNotes[budget.id] ?? ''}
                          />
                        ) : null}
                        <p className="text-xs font-medium">Payment mode</p>
                        <PaymentModeChips
                          accounts={accounts}
                          onChange={(id) =>
                            setSpendAccountIds((current) => ({ ...current, [budget.id]: id }))
                          }
                          value={modeId}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            className="auth-input"
                            inputMode="decimal"
                            onChange={(event) =>
                              setSpendAmounts((current) => ({
                                ...current,
                                [budget.id]: event.target.value,
                              }))
                            }
                            placeholder="Amount spent"
                            value={spendAmounts[budget.id] ?? ''}
                          />
                          <input
                            className="auth-input"
                            onChange={(event) =>
                              setSpendDates((current) => ({
                                ...current,
                                [budget.id]: event.target.value,
                              }))
                            }
                            type="date"
                            value={spendDates[budget.id] || today()}
                          />
                          <button
                            className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold"
                            disabled={saving}
                            onClick={() => void onSpendBudget(budget)}
                            type="button"
                          >
                            Subtract
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            className="auth-input"
                            inputMode="decimal"
                            onChange={(event) =>
                              setBudgetCaps((current) => ({
                                ...current,
                                [budget.id]: event.target.value,
                              }))
                            }
                            placeholder={`Update cap (${budget.total_amount})`}
                            value={budgetCaps[budget.id] ?? ''}
                          />
                          <button
                            className="shrink-0 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
                            disabled={saving}
                            onClick={() => void onUpdateBudget(budget)}
                            type="button"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>
        <p className="mt-10 text-center text-xs text-[var(--muted)]">{APP_CREDIT}</p>
      </main>
    </div>
  );
}
