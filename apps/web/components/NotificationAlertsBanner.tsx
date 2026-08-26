'use client';

import type { PesoNotificationAlert } from '@perakita/shared';

export function NotificationAlertsBanner({
  alerts,
  onDismiss,
}: {
  alerts: PesoNotificationAlert[];
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{alert.title}</p>
            <p className="mt-1 text-sm text-amber-950/90 dark:text-amber-50/90">{alert.body}</p>
          </div>
          <button
            aria-label="Dismiss alert"
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-amber-900/80 dark:text-amber-100/80"
            onClick={() => onDismiss(alert.id)}
            type="button"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
