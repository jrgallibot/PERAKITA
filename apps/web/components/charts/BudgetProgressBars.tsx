'use client';

import type { BudgetStat } from '@perakita/shared';
import { formatCurrency } from '@perakita/shared';

type BudgetProgressBarsProps = {
  budgets: BudgetStat[];
};

export function BudgetProgressBars({ budgets }: BudgetProgressBarsProps) {
  if (budgets.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">No budgets yet. Create one from Manage Finances.</p>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const over = budget.spent > budget.total;
        const barColor = over ? 'bg-rose-500' : budget.percent >= 80 ? 'bg-amber-500' : 'bg-primary';
        return (
          <div key={budget.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-semibold">{budget.name}</span>
              <span className="shrink-0 text-[var(--muted)]">
                {formatCurrency(budget.spent)} / {formatCurrency(budget.total)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(100, budget.percent)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{budget.percent}% used</p>
          </div>
        );
      })}
    </div>
  );
}
