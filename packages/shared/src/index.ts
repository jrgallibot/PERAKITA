import { z } from 'zod';

export const APP_NAME = 'PeraKita';
export const APP_TAGLINE = 'Know where your money goes - even offline.';
export const APP_DEVELOPER = 'Russel Gallibot';
export const APP_CREDIT = `Created and developed by ${APP_DEVELOPER}`;
export const APP_ABOUT =
  'PeraKita (pera + kita) is an offline-first personal finance companion built for everyday Filipino money habits. Track income and expenses in Philippine pesos, manage loans with kinsena schedules, set budgets, and keep a clear Current Balance on your phone - even without signal. When you are online, Sync Now pushes your data to the cloud so the same account stays in sync on the web dashboard.';
export const APP_ABOUT_POINTS = [
  'Offline-first ledger on your device with optional cloud sync',
  'Income, expenses, budgets, and loan tracking in PHP',
  'Kinsena-aware loan payments (15th and month-end)',
  'Same account on mobile and the web dashboard',
] as const;
export const APP_ANDROID_APK_BUILD = '2026-09-11';
export const APP_ANDROID_APK_PATH = `/downloads/perakita.apk?v=${APP_ANDROID_APK_BUILD}`;
export const APP_ANDROID_APK_FILENAME = 'PeraKita.apk';
export const APP_ANDROID_APK_LABEL = 'Android APK · Sep 11, 2026 build';
export const APP_ANDROID_APK_SIZE_LABEL = '~49 MB';
export const APP_ANDROID_APK_BLURB =
  'Install on Android for offline-first pesos, budgets, kinsena loans, and linked GCash/Maya/bank balances. Sign in with the same account to sync with the web dashboard.';
export const APP_CONCEPT_TITLE = 'Built for how money actually moves';
export const APP_CONCEPT =
  'PeraKita treats your phone as the source of truth. Every peso you earn, spend, lend, or repay is written to a local ledger first - so you stay in control anywhere signal drops. The cloud is optional sync, not a gatekeeper.';
export const APP_WORKFLOW = [
  { title: 'Capture on device', body: 'Log income, expenses, budgets, and loans in PHP. Data lives locally so the app keeps working offline.' },
  { title: 'See your balance clearly', body: 'Current Balance, budgets, and kinsena-aware loan due dates stay visible so you know what is left and what is due.' },
  { title: 'Sync when you are ready', body: 'With internet, Sync Now pushes your ledger to the cloud. The same account powers the web dashboard.' },
  { title: 'Review and adjust', body: 'Spot spending patterns, update loan payments, tighten budgets, and keep mobile and web aligned.' },
] as const;
export const APP_FAQ = [
  { q: 'What does PeraKita mean?', a: 'Pera + kita - money and us. It is personal finance built for everyday Filipino money habits.' },
  { q: 'Does it work without internet?', a: 'Yes. The mobile app is offline-first. Sync is available when you are online.' },
  { q: 'What can I track?', a: 'Income, expenses, budgets, and loans in Philippine pesos, including kinsena-style payment schedules.' },
  { q: 'How do mobile and web stay in sync?', a: 'Sign in with the same account. On mobile, use Sync Now when online.' },
  { q: 'Is my data private?', a: 'Your ledger starts on your device. Cloud sync uses your authenticated account.' },
  { q: 'Can I link GCash, Maya, or my bank account?', a: 'You can track wallet and bank balances manually by refreshing them from your real wallet or bank app.' },
  { q: 'How do I install the Android app?', a: 'Tap Download APK, open the file, allow installs from your browser if Android asks, then install.' },
  { q: 'Who built PeraKita?', a: APP_CREDIT },
] as const;

export type ThemeMode = 'light' | 'dark' | 'system';
export type Sex = 'male' | 'female' | 'other';
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export const REPORT_PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export const DEFAULT_CURRENCY = 'PHP';
export function formatCurrency(value: number, options: { showSign?: boolean } = {}): string {
  const amount = Number(value) || 0;
  const formatted = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Math.abs(amount));
  if (!options.showSign) return amount < 0 ? `-${formatted}` : formatted;
  return `${amount >= 0 ? '+' : '-'}${formatted}`;
}

export const typography = { fontFamily: 'Plus Jakarta Sans' } as const;
export const borderRadius = { sm: 8, md: 12, lg: 20, xl: 24 } as const;

export type AccountProvider = 'cash' | 'gcash' | 'maya' | 'bank' | 'card' | 'other';
export type Account = {
  id: string;
  name: string;
  current_balance?: number;
  provider?: AccountProvider | null;
  is_linked?: boolean;
  last_balance_sync_at?: string | null;
};
export const ACCOUNT_PROVIDER_LABELS: Record<AccountProvider, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank',
  card: 'Card',
  other: 'Other',
};
export const PAYMENT_METHODS = ['Cash', 'GCash', 'Maya', 'Bank'] as const;
export const DEFAULT_PAYMENT_METHOD = 'Cash';
export const DEFAULT_ACCOUNTS = [
  { name: 'Cash', type: 'cash', provider: 'cash' as const },
  { name: 'GCash', type: 'ewallet', provider: 'gcash' as const },
  { name: 'Maya', type: 'ewallet', provider: 'maya' as const },
  { name: 'Bank', type: 'bank', provider: 'bank' as const },
];
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#14B8A6' },
  { name: 'Transport', icon: 'bus', color: '#3B82F6' },
  { name: 'Bills', icon: 'receipt', color: '#F59E0B' },
  { name: 'School', icon: 'book', color: '#8B5CF6' },
  { name: 'Other', icon: 'more', color: '#94A3B8' },
];
export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'wallet', color: '#10B981' },
  { name: 'Allowance', icon: 'gift', color: '#22C55E' },
  { name: 'Other', icon: 'more', color: '#94A3B8' },
];
export function providerFromAccountName(name: string): AccountProvider {
  const n = name.toLowerCase();
  if (n.includes('gcash')) return 'gcash';
  if (n.includes('maya')) return 'maya';
  if (n.includes('bank')) return 'bank';
  if (n.includes('card')) return 'card';
  if (n.includes('cash')) return 'cash';
  return 'other';
}
export function isLinkableProvider(provider: AccountProvider | null | undefined): boolean {
  return !!provider && provider !== 'cash' && provider !== 'other';
}
export function sortPaymentAccounts<T extends { name: string; provider?: AccountProvider | null }>(accounts: T[]): T[] {
  const rank: Record<AccountProvider, number> = { cash: 0, gcash: 1, maya: 2, bank: 3, card: 4, other: 5 };
  return [...accounts].sort((a, b) => {
    const ar = rank[a.provider ?? providerFromAccountName(a.name)] ?? 9;
    const br = rank[b.provider ?? providerFromAccountName(b.name)] ?? 9;
    return ar - br || a.name.localeCompare(b.name);
  });
}
export function reconcileAccountBalance(current: number, reported: number): number {
  return Number(reported) - Number(current);
}
export function formatLastBalanceSync(value?: string | null): string {
  if (!value) return 'Not refreshed yet';
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const registerSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  acceptTerms: z.boolean().refine(Boolean, 'You must accept the terms'),
}).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ password: z.string().min(6), confirmPassword: z.string().min(6) }).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6), confirmPassword: z.string().min(6) }).refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export const profileSchema = z.object({
  display_name: z.string().min(1, 'Full name is required'),
  contact: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  sex: z.enum(['male', 'female', 'other']).nullable(),
});
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type Profile = {
  id?: string;
  user_id?: string;
  display_name: string | null;
  contact: string | null;
  address: string | null;
  birthday: string | null;
  sex: Sex | null;
  avatar_url: string | null;
  default_currency?: string;
  report_email_enabled: boolean;
  report_email_period: ReportPeriod;
  report_email_last_sent_at?: string | null;
  notify_enabled: boolean;
  notify_bills: boolean;
  notify_loans: boolean;
  notify_budget: boolean;
  notify_safe_to_spend: boolean;
  notify_goals: boolean;
  created_at?: string;
  updated_at?: string;
};
export function mapAuthError(message: string): string {
  if (/invalid/i.test(message)) return 'Invalid email or password.';
  if (/already/i.test(message)) return 'An account with this email already exists.';
  return message;
}
export function ageFromBirthday(birthday?: string | null): number | null {
  if (!birthday) return null;
  const d = new Date(birthday);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export type BudgetStat = { id: string; name: string; spent: number; total: number; percent: number };
export type SpendingSlice = { name: string; color: string; total: number; percent: number };
export type DailyTrendPoint = { date: string; label: string; income: number; expense: number };
export function buildBudgetStats(budgets: Array<{ id: string; name: string; total_amount?: number; total?: number; spent?: number }>): BudgetStat[] {
  return budgets.map((b) => {
    const total = Number(b.total_amount ?? b.total ?? 0);
    const spent = Number(b.spent ?? 0);
    return { id: b.id, name: b.name, spent, total, percent: total > 0 ? Math.round((spent / total) * 100) : 0 };
  });
}
export function buildSpendingBreakdown(rows: Array<{ name: string; color?: string | null; total: number }>): SpendingSlice[] {
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  return rows.map((r) => ({ name: r.name, color: r.color || '#94A3B8', total: Number(r.total || 0), percent: total > 0 ? Math.round((Number(r.total || 0) / total) * 100) : 0 }));
}
export function getReportPeriodRange(period: ReportPeriod, date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  let start: Date;
  let end: Date;
  if (period === 'daily') {
    start = new Date(y, m, date.getDate());
    end = new Date(y, m, date.getDate());
  } else if (period === 'weekly') {
    const day = date.getDay();
    start = new Date(y, m, date.getDate() - day);
    end = new Date(y, m, date.getDate() - day + 6);
  } else if (period === 'yearly') {
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31);
  } else {
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 0);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: period === 'yearly' ? String(y) : start.toLocaleString('en-PH', { month: 'long', year: 'numeric' }),
    period,
  };
}
export function buildPeriodTrend(rows: Array<{ transaction_date: string; type: string; amount: number }>, range: ReturnType<typeof getReportPeriodRange>): DailyTrendPoint[] {
  if (range.period === 'yearly') {
    return Array.from({ length: 12 }, (_, i) => {
      const date = `${range.start.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`;
      const label = new Date(Number(range.start.slice(0, 4)), i, 1).toLocaleString('en-PH', { month: 'short' });
      const inMonth = rows.filter((r) => r.transaction_date.startsWith(date));
      return point(date, label, inMonth);
    });
  }
  const out: DailyTrendPoint[] = [];
  for (let d = new Date(range.start); d <= new Date(range.end); d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    out.push(point(iso, d.toLocaleString('en-PH', { weekday: 'short', day: 'numeric' }), rows.filter((r) => r.transaction_date === iso)));
  }
  return out;
}
function point(date: string, label: string, rows: Array<{ type: string; amount: number }>): DailyTrendPoint {
  return {
    date,
    label,
    income: rows.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount || 0), 0),
    expense: rows.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount || 0), 0),
  };
}

export type LoanType = 'debt' | 'receivable';
export function calculateLoanInterest(principal: number, interestRate = 0, opts?: { startDate?: string; dueDate?: string }) {
  const p = Math.max(0, Number(principal) || 0);
  const rate = Math.max(0, Number(interestRate) || 0);
  const days =
    opts?.startDate && opts?.dueDate
      ? Math.max(0, Math.ceil((new Date(opts.dueDate).getTime() - new Date(opts.startDate).getTime()) / 86400000))
      : 0;
  const months = days > 0 ? Math.max(1, Math.ceil(days / 30)) : 1;
  const interest = p * (rate / 100) * months;
  return { principal: p, interestRate: rate, interest, total: p + interest, days, months };
}
export function nextKinsenaWindows(fromIso = todayIso()) {
  const d = new Date(fromIso);
  const y = d.getFullYear();
  const m = d.getMonth();
  const firstDue = new Date(y, m, 15).toISOString().slice(0, 10);
  const firstGrace = new Date(y, m, 20).toISOString().slice(0, 10);
  const secondDue = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  const secondGrace = new Date(y, m + 1, 5).toISOString().slice(0, 10);
  return [
    { label: '15th', due: firstDue, dueDate: firstDue, graceEnds: firstGrace },
    { label: 'Month-end', due: secondDue, dueDate: secondDue, graceEnds: secondGrace },
  ];
}
export function evaluateKinsenaPayment(paymentDate: string, remainingAmount: number, interestRate = 0) {
  const dueDate = Number(paymentDate.slice(8, 10)) <= 20 ? `${paymentDate.slice(0, 8)}15` : new Date(new Date(paymentDate).getFullYear(), new Date(paymentDate).getMonth() + 1, 0).toISOString().slice(0, 10);
  const graceEnds = new Date(dueDate);
  graceEnds.setDate(graceEnds.getDate() + 5);
  const late = new Date(paymentDate) > graceEnds;
  const penalty = late ? Math.round((Number(remainingAmount) || 0) * ((Number(interestRate) || 0) / 100)) : 0;
  return { dueDate, graceEnds: graceEnds.toISOString().slice(0, 10), late, penalty, periodLabel: dueDate.endsWith('-15') ? '15th' : 'month-end' };
}
export function getDueTodayLoanAlerts(loans: Array<{ id: string; person_name: string; loan_type: LoanType; remaining_amount: number; due_date: string | null; status: string }>) {
  const today = todayIso();
  return loans.filter((l) => l.status !== 'paid' && l.status !== 'cancelled' && l.due_date === today);
}
export type DueTodayAlerts = ReturnType<typeof getDueTodayLoanAlerts>;
export function loanPaymentTimeline(loan: any, payments: any[]) {
  let paid = 0;
  return [...payments].sort((a, b) => String(a.payment_date).localeCompare(String(b.payment_date))).map((p, i) => {
    const k = evaluateKinsenaPayment(p.payment_date, loan.remaining_amount, loan.interest_rate);
    paid += Number(p.amount || 0);
    return {
      ...k,
      id: p.id,
      step: i + 1,
      amount: Number(p.amount || 0),
      paymentDate: p.payment_date,
      method: p.method ?? p.payment_method ?? 'Cash',
      statusLabel: k.late ? 'Late' : 'On time',
      paidToDate: paid,
      remainingAfter: Math.max(0, Number(loan.total_amount || 0) - paid),
    };
  });
}
export function budgetSpendTimeline(budget: any, transactions: any[]) {
  let spent = 0;
  return [...transactions].sort((a, b) => String(a.transaction_date).localeCompare(String(b.transaction_date))).map((tx, i) => {
    spent += Number(tx.amount || 0);
    return { id: tx.id, step: i + 1, amount: -Math.abs(Number(tx.amount || 0)), spendDate: tx.transaction_date, category: tx.category_name ?? 'Expense', method: tx.account_name ?? 'Cash', description: tx.description ?? null, planTotal: Number(budget.total_amount || budget.total || 0), spentToDate: spent, remainingAfter: Math.max(0, Number(budget.total_amount || budget.total || 0) - spent), overBudget: spent > Number(budget.total_amount || budget.total || 0) };
  });
}

export type NotificationPrefs = {
  enabled: boolean;
  bills: boolean;
  loans: boolean;
  budget: boolean;
  safeToSpend: boolean;
  goals: boolean;
};
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  bills: true,
  loans: true,
  budget: true,
  safeToSpend: true,
  goals: true,
};
export type PesoNotificationAlert = { id: string; title: string; body: string; tone?: 'info' | 'warning' | 'danger' | 'success' };
export type PesoDashboardSnapshot = {
  currentBalance: number;
  realAvailable: number;
  safeToSpendToday: number;
  daysUntilPayday: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSavings: number;
  totalDebt: number;
  healthScore: ReturnType<typeof computeHealthScore>;
  upcomingBills: UpcomingBill[];
  forecast: ReturnType<typeof computeForecast>;
  spendingRisk: ReturnType<typeof detectSpendingRisk>;
  avgDailySpend: number;
  plannedSavings: number;
  upcomingCommitments: number;
  [key: string]: unknown;
};
export const PESO_AI_DISCLAIMER = 'PeraKita AI gives general budgeting guidance, not financial advice.';
export const PESO_AI_SUGGESTIONS = ['How can I lower expenses?', 'What should I budget next?', 'Summarize my finances'];
export function buildPesoNotificationAlerts(
  snapshot: any,
  prefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS,
  budgets: Array<{ percent?: number; name?: string }> = [],
  goals: Array<{ progress?: number; name?: string }> = [],
): PesoNotificationAlert[] {
  if (!prefs.enabled) return [];
  const alerts: PesoNotificationAlert[] = [];
  if (prefs.safeToSpend && typeof snapshot?.balance === 'number') alerts.push({ id: 'safe', title: 'Safe-to-spend', body: `Current balance: ${formatCurrency(snapshot.balance)}`, tone: 'info' });
  if (prefs.loans && Array.isArray(snapshot?.dueToday) && snapshot.dueToday.length > 0) alerts.push({ id: 'loans', title: 'Loan due today', body: `${snapshot.dueToday.length} loan reminder(s)`, tone: 'warning' });
  const hotBudget = budgets.find((budget) => Number(budget.percent ?? 0) >= 85);
  if (prefs.budget && hotBudget) alerts.push({ id: 'budget', title: 'Budget warning', body: `${hotBudget.name ?? 'A budget'} is near its limit.`, tone: 'warning' });
  const nearlyDoneGoal = goals.find((goal) => Number(goal.progress ?? 0) >= 75 && Number(goal.progress ?? 0) < 100);
  if (prefs.goals && nearlyDoneGoal) alerts.push({ id: 'goal', title: 'Savings goal progress', body: `${nearlyDoneGoal.name ?? 'A goal'} is getting close.`, tone: 'success' });
  return alerts;
}
export function generatePesoInsight(snapshot: PesoDashboardSnapshot): string {
  const s = snapshot as any;
  return `Income ${formatCurrency(s.income ?? 0)}, expenses ${formatCurrency(s.expenses ?? 0)}, balance ${formatCurrency(s.balance ?? 0)}.`;
}
export function computeRealAvailable(input: {
  balance: number;
  upcomingCommitments?: number;
  plannedSavings?: number;
}): number {
  return Math.max(0, Number(input.balance || 0) - Number(input.upcomingCommitments || 0) - Number(input.plannedSavings || 0));
}
export function computeDaysUntilPayday(nextPayday: string, today = todayIso()): number {
  const diff = Math.ceil((new Date(nextPayday).getTime() - new Date(today).getTime()) / 86400000);
  return Math.max(1, Number.isFinite(diff) ? diff : 30);
}
export function computeSafeToSpendDaily(input: { realAvailable: number; daysUntilPayday: number }): number {
  return Math.max(0, Number(input.realAvailable || 0) / Math.max(1, Number(input.daysUntilPayday || 1)));
}
export function computeAvgDailySpend(total: number, days: number): number {
  return Math.max(0, Number(total || 0) / Math.max(1, Number(days || 1)));
}
export function computeForecast(input: {
  balance: number;
  avgDailySpend: number;
  daysRemaining: number;
  upcomingCommitments?: number;
  plannedSavings?: number;
  nextPayday?: string | null;
  today?: string;
}) {
  const projectedExpenses = Number(input.avgDailySpend || 0) * Math.max(0, Number(input.daysRemaining || 0));
  const projectedBalance =
    Number(input.balance || 0) - projectedExpenses - Number(input.upcomingCommitments || 0) - Number(input.plannedSavings || 0);
  return {
    projectedBalance,
    projectedExpenses,
    nextPayday: input.nextPayday ?? null,
    status: projectedBalance >= 0 ? 'ok' : 'shortfall',
    message: projectedBalance >= 0 ? 'You are projected to stay above zero.' : 'Projected shortfall before payday.',
    warning: projectedBalance < 0 ? 'You may run short before your next payday.' : null,
  };
}
export function detectSpendingRisk(input: { forecast: any; recentDailyAvg: number; baselineDailyAvg: number }) {
  const recent = Number(input.recentDailyAvg || 0);
  const baseline = Number(input.baselineDailyAvg || 0);
  const elevated = baseline > 0 && recent > baseline * 1.25;
  const high = input.forecast?.projectedBalance < 0;
  return {
    detected: high || elevated,
    level: high ? 'high' : elevated ? 'medium' : 'low',
    message: elevated ? 'Recent spending is above baseline.' : 'Spending looks stable.',
  };
}
export function recommendEmergencyFundTarget(monthlyEssentials: number): number {
  return Math.max(0, Number(monthlyEssentials || 0) * 3);
}
export function computeHealthScore(input: {
  budgetCompliancePercent: number;
  savingsRatePercent: number;
  debtToIncomeRatio: number;
  expenseStabilityPercent: number;
  emergencyFundProgressPercent: number;
}) {
  const debtScore = Math.max(0, 100 - Number(input.debtToIncomeRatio || 0) * 100);
  const score = Math.round(
    (Number(input.budgetCompliancePercent || 0) +
      Number(input.savingsRatePercent || 0) +
      debtScore +
      Number(input.expenseStabilityPercent || 0) +
      Number(input.emergencyFundProgressPercent || 0)) /
      5,
  );
  return {
    score: Math.max(0, Math.min(100, score)),
    budget: input.budgetCompliancePercent,
    savings: input.savingsRatePercent,
    debt: debtScore,
    stability: input.expenseStabilityPercent,
    emergency: input.emergencyFundProgressPercent,
  };
}
export function answerPesoChat(first: PesoDashboardSnapshot | string, second: PesoDashboardSnapshot | string): string {
  const message = typeof first === 'string' ? first : String(second);
  return `I read your question: "${message}". Review your spending, protect essentials, and keep savings realistic.`;
}

export type SavingsGoalCategory = 'emergency' | 'education' | 'travel' | 'gadget' | 'home' | 'other';
export type SavingsGoalPriority = 'low' | 'medium' | 'high';
export const SAVINGS_GOAL_CATEGORIES = [
  { value: 'emergency', label: 'Emergency', icon: 'shield', defaultName: 'Emergency fund' },
  { value: 'education', label: 'Education', icon: 'book', defaultName: 'Education savings' },
  { value: 'travel', label: 'Travel', icon: 'plane', defaultName: 'Travel fund' },
  { value: 'gadget', label: 'Gadget', icon: 'phone', defaultName: 'New gadget' },
  { value: 'home', label: 'Home', icon: 'home', defaultName: 'Home savings' },
  { value: 'other', label: 'Other', icon: 'target', defaultName: 'Savings goal' },
] as const;
export type SavingsGoal = {
  id: string;
  name: string;
  category: SavingsGoalCategory;
  icon?: string | null;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  priority?: SavingsGoalPriority;
  description?: string | null;
  is_completed?: boolean;
  is_archived?: boolean;
};
export type SavingsContribution = { id: string; goal_id: string; amount: number; contribution_date: string; source?: string | null; notes?: string | null };
export type GoalMilestone = { id?: string; goal_id: string; percentage: number; reached_at?: string };
export const savingsGoalSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['emergency', 'education', 'travel', 'gadget', 'home', 'other']),
  icon: z.string().optional().nullable(),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).default(0),
  target_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  description: z.string().optional().nullable(),
});
export const savingsContributionSchema = z.object({
  goal_id: z.string().min(1),
  amount: z.number().positive(),
  contribution_date: z.string().min(1),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type SavingsContributionInput = z.infer<typeof savingsContributionSchema>;
export type GoalSummary = {
  totalSaved: number;
  totalTargets: number;
  overallProgress: number;
  monthlyContributions: number;
  activeGoals: number;
  completedGoals: number;
};
export type EnrichedSavingsGoal = ReturnType<typeof enrichSavingsGoal>;
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
export const todayIsoLocal = todayIso;
export function computeGoalsSummary(goals: SavingsGoal[], contributions: SavingsContribution[]): GoalSummary {
  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalTargets = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const month = todayIso().slice(0, 7);
  const monthlyContributions = contributions.filter((c) => c.contribution_date?.startsWith(month)).reduce((s, c) => s + Number(c.amount || 0), 0);
  return {
    totalSaved,
    totalTargets,
    overallProgress: totalTargets > 0 ? (totalSaved / totalTargets) * 100 : 0,
    monthlyContributions,
    activeGoals: goals.filter((goal) => !goal.is_completed && !goal.is_archived).length,
    completedGoals: goals.filter((goal) => goal.is_completed).length,
  };
}
export function enrichSavingsGoal(goal: SavingsGoal, contributions: SavingsContribution[], milestones: GoalMilestone[]) {
  const progressPercentage = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
  const remainingAmount = Math.max(0, goal.target_amount - goal.current_amount);
  const daysLeft = goal.target_date ? Math.max(1, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)) : 30;
  const status = progressPercentage >= 100 ? 'completed' : goal.target_date && new Date(goal.target_date) < new Date() ? 'behind' : 'on_track';
  return {
    goal,
    contributions,
    calculations: { progressPercentage, remainingAmount, requiredDailySavings: remainingAmount / daysLeft },
    status,
    forecast: { forecastMessage: remainingAmount > 0 ? `${formatCurrency(Math.ceil(remainingAmount / daysLeft))} per day to reach this goal.` : 'Goal reached.' },
    milestonesReached: milestones,
  };
}
export function formatGoalStatusEmoji(status: string): string {
  return status === 'completed' ? '✓' : status === 'behind' ? '!' : '•';
}
export function goalStatusLabel(status: string): string {
  return status === 'completed' ? 'Completed' : status === 'behind' ? 'Needs attention' : 'On track';
}
export function detectNewMilestones(progress: number, existing: GoalMilestone[]): number[] {
  const hit = new Set(existing.map((m) => m.percentage));
  return [25, 50, 75, 100].filter((p) => progress >= p && !hit.has(p));
}
export function milestoneMessage(name: string, percentage: number): string {
  return `${name} reached ${percentage}%`;
}

export type EmergencyFundTarget = { id?: string; target_amount: number; current_amount: number; recommended_target?: number | null };
export type EmergencyFundSummary = {
  targetAmount: number;
  currentAmount: number;
  recommendedTarget: number;
  progressPercentage: number;
  monthsCovered: number;
  remainingAmount: number;
};
export const emergencyFundSchema = z.object({
  target_amount: z.number().positive(),
  current_amount: z.number().min(0),
  recommended_target: z.number().optional().nullable(),
});
export function computeEmergencyFundSummary(input: { targetAmount?: number | null; currentAmount?: number | null; recommendedTarget?: number | null; monthlyEssentials?: number | null }): EmergencyFundSummary {
  const recommendedTarget = Number(input.recommendedTarget ?? (Number(input.monthlyEssentials || 0) * 3));
  const targetAmount = Number(input.targetAmount ?? recommendedTarget);
  const currentAmount = Number(input.currentAmount ?? 0);
  return {
    targetAmount,
    currentAmount,
    recommendedTarget,
    progressPercentage: targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0,
    monthsCovered: Number(input.monthlyEssentials || 0) > 0 ? currentAmount / Number(input.monthlyEssentials) : 0,
    remainingAmount: Math.max(0, targetAmount - currentAmount),
  };
}

export const recurringExpenseSchema = z.object({});
export type CategoryType = 'income' | 'expense';
export type TransactionType = 'income' | 'expense' | 'adjustment' | 'loan_received' | 'loan_given' | 'loan_payment' | 'debt_payment';
export type SyncStatus = 'synced' | 'pending' | 'updated' | 'deleted';
export type SyncQueueOperation = 'create' | 'update' | 'delete';
export type SyncQueueItem = Record<string, unknown>;
export type Category = Record<string, unknown>;
export type Transaction = Record<string, unknown>;
export type Budget = Record<string, unknown>;
export type BudgetCategory = Record<string, unknown>;
export type RecurringExpense = Record<string, unknown>;
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type FinancialProfile = Record<string, unknown>;
export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly';
export type LoanPaymentSummary = Record<string, unknown>;
export type BudgetSpendSummary = Record<string, unknown>;
export type HealthScoreBreakdown = Record<string, unknown>;
export type SpendingRiskResult = Record<string, unknown>;
export type UpcomingBill = Record<string, unknown>;
export type AchievementCode = string;
export type Achievement = Record<string, unknown>;
export type UserAchievement = Record<string, unknown>;
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [];
export const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL ?? '';
export function normalizeWebAppUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
export function webAppPath(path: string): string {
  return `${normalizeWebAppUrl(WEB_APP_URL)}${path.startsWith('/') ? path : `/${path}`}`;
}
