import { financialProfileRepository } from '@/database/repositories/financialProfileRepository';
import { recurringExpenseRepository } from '@/database/repositories/recurringExpenseRepository';
import { savingsGoalRepository } from '@/database/repositories/savingsGoalRepository';
import { budgetRepository } from '@/database/repositories/budgetRepository';
import { loanRepository } from '@/database/repositories/loanRepository';
import { transactionRepository } from '@/database/repositories/transactionRepository';
import { categoryRepository } from '@/database/repositories/categoryRepository';
import { accountRepository } from '@/database/repositories/accountRepository';
import { achievementRepository } from '@/database/repositories/achievementRepository';
import { todayIso } from '@perakita/shared';

function nextMonthDay(day: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d < now) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function loadDemoSeed(userId: string): Promise<void> {
  await achievementRepository.seedDefaults();
  await accountRepository.ensureDefaults(userId);
  const accounts = await accountRepository.findAll(userId);
  const cash = accounts.find((a) => a.type === 'cash');
  if (!cash) throw new Error('Cash account missing');

  const categories = await categoryRepository.findAll(userId);
  const findCat = (name: string) => categories.find((c) => c.name.toLowerCase() === name.toLowerCase());

  const payday = addDays(30);
  await financialProfileRepository.upsert(userId, {
    currency: 'PHP',
    current_money: 25000,
    income_source: 'Salary',
    income_amount: 25000,
    income_frequency: 'monthly',
    next_payday: payday,
    onboarding_completed: true,
  });

  const delta = 25000 - cash.current_balance;
  if (delta !== 0) await accountRepository.adjustBalance(cash.id, delta);

  await transactionRepository.create(userId, {
    account_id: cash.id,
    category_id: findCat('Salary')?.id ?? null,
    type: 'income',
    amount: 25000,
    description: 'Monthly salary',
    transaction_date: todayIso(),
    payment_method: 'Bank',
  });

  const expenses: Array<{ cat: string; amount: number; desc: string }> = [
    { cat: 'Rent', amount: 6000, desc: 'Rent' },
    { cat: 'Electricity', amount: 2000, desc: 'Electricity' },
    { cat: 'Internet', amount: 1500, desc: 'Internet' },
    { cat: 'Food', amount: 4500, desc: 'Food budget' },
    { cat: 'Transportation', amount: 2000, desc: 'Transportation' },
    { cat: 'Shopping', amount: 2000, desc: 'Shopping' },
  ];

  for (const exp of expenses) {
    await transactionRepository.create(userId, {
      account_id: cash.id,
      category_id: findCat(exp.cat)?.id ?? null,
      type: 'expense',
      amount: exp.amount,
      description: exp.desc,
      transaction_date: todayIso(),
      payment_method: 'Cash',
    });
  }

  await loanRepository.create(userId, {
    person_name: 'Personal Loan',
    loan_type: 'debt',
    amount: 3000,
    interest_rate: 0,
    due_date: nextMonthDay(25),
    notes: 'Monthly loan payment',
    account_id: cash.id,
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  await budgetRepository.create(userId, {
    name: 'Monthly budget',
    period_start: monthStart,
    period_end: monthEnd,
    total_amount: 20000,
  });

  const budgets = await budgetRepository.findAllWithProgress(userId);
  const budget = budgets[0];
  if (budget) {
    const food = findCat('Food');
    if (food) await budgetRepository.addCategory(userId, budget.id, food.id, 4000);
  }

  await recurringExpenseRepository.create(userId, {
    name: 'Internet',
    amount: 1500,
    category_id: findCat('Internet')?.id ?? null,
    frequency: 'monthly',
    next_due_date: nextMonthDay(10),
    payment_method: 'GCash',
  });

  await recurringExpenseRepository.create(userId, {
    name: 'Electricity',
    amount: 1200,
    category_id: findCat('Electricity')?.id ?? null,
    frequency: 'monthly',
    next_due_date: nextMonthDay(15),
    payment_method: 'Bank',
  });

  const goalDate = addDays(120);
  await savingsGoalRepository.create(userId, {
    name: 'New Phone',
    category: 'phone',
    icon: 'phone-portrait-outline',
    target_amount: 20000,
    current_amount: 5000,
    target_date: goalDate,
    priority: 'high',
  });

  await achievementRepository.unlock(userId, 'first_expense');
}
