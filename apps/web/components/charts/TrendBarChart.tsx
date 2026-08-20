'use client';

import type { DailyTrendPoint } from '@perakita/shared';

type TrendBarChartProps = {
  points: DailyTrendPoint[];
};

export function TrendBarChart({ points }: TrendBarChartProps) {
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [point.income, point.expense])
  );

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {points.map((point) => {
          const incomeHeight = Math.round((point.income / maxValue) * 100);
          const expenseHeight = Math.round((point.expense / maxValue) * 100);
          return (
            <div
              className="flex min-w-[2.25rem] flex-1 flex-col items-center gap-1"
              key={point.date}
              title={`${point.label}: +${point.income} / -${point.expense}`}
            >
              <div className="flex h-28 w-full items-end justify-center gap-0.5 sm:h-32">
                <div
                  className="w-2 rounded-t bg-emerald-500 sm:w-2.5"
                  style={{ height: `${Math.max(incomeHeight, point.income > 0 ? 4 : 0)}%` }}
                />
                <div
                  className="w-2 rounded-t bg-rose-500 sm:w-2.5"
                  style={{ height: `${Math.max(expenseHeight, point.expense > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-[var(--muted)] sm:text-xs">
                {point.label.replace(/^\w+ /, '')}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          Income
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
          Expenses
        </span>
      </div>
    </div>
  );
}
