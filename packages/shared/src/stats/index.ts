export type SpendingSlice = {
  name: string;
  color: string;
  total: number;
  percent: number;
};

export type DailyTrendPoint = {
  date: string;
  label: string;
  income: number;
  expense: number;
};

export type BudgetStat = {
  id: string;
  name: string;
  total: number;
  spent: number;
  percent: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function shortLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function buildSpendingBreakdown(
  rows: Array<{ name: string | null; color: string | null; total: number }>
): SpendingSlice[] {
  const grand = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  if (grand <= 0) return [];
  return rows.map((row) => ({
    name: row.name ?? 'Uncategorized',
    color: row.color ?? '#94A3B8',
    total: Number(row.total ?? 0),
    percent: Math.round((Number(row.total ?? 0) / grand) * 100),
  }));
}

export function buildDailyTrend(
  rows: Array<{ transaction_date: string; type: string; amount: number }>,
  days = 14
): DailyTrendPoint[] {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  const buckets = new Map<string, { income: number; expense: number }>();

  for (let i = 0; i < days; i += 1) {
    const cursor = new Date(start);
    cursor.setDate(start.getDate() + i);
    buckets.set(toIsoDay(cursor), { income: 0, expense: 0 });
  }

  for (const row of rows) {
    const bucket = buckets.get(row.transaction_date);
    if (!bucket) continue;
    if (row.type === 'income') bucket.income += Number(row.amount ?? 0);
    if (row.type === 'expense') bucket.expense += Number(row.amount ?? 0);
  }

  return [...buckets.entries()].map(([date, totals]) => ({
    date,
    label: shortLabel(date),
    income: Math.round(totals.income * 100) / 100,
    expense: Math.round(totals.expense * 100) / 100,
  }));
}

export function buildBudgetStats(
  budgets: Array<{ id: string; name: string; total_amount: number; spent: number }>
): BudgetStat[] {
  return budgets.map((budget) => ({
    id: budget.id,
    name: budget.name,
    total: budget.total_amount,
    spent: budget.spent,
    percent:
      budget.total_amount > 0
        ? Math.min(100, Math.round((budget.spent / budget.total_amount) * 100))
        : 0,
  }));
}
