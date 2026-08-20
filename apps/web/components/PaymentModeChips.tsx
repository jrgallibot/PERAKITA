'use client';

import { sortPaymentAccounts } from '@perakita/shared';

type Mode = { id: string; name: string };

export function PaymentModeChips({
  accounts,
  value,
  onChange,
}: {
  accounts: Mode[];
  value: string;
  onChange: (id: string) => void;
}) {
  const ordered = sortPaymentAccounts(accounts);

  if (ordered.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No payment modes yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ordered.map((account) => {
        const selected = account.id === value;
        return (
          <button
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${
              selected
                ? 'border-primary bg-primary text-white dark:text-slate-950'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]'
            }`}
            key={account.id}
            onClick={() => onChange(account.id)}
            type="button"
          >
            {account.name}
          </button>
        );
      })}
    </div>
  );
}
