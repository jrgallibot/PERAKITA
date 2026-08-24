import type { ReportPeriod } from '@perakita/shared';
import { supabase } from '@/lib/supabase';

export type SendFinanceReportResult = {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  emailed?: string;
  period?: ReportPeriod;
  label?: string;
  error?: string;
};

export async function sendFinanceReportEmail(input?: {
  period?: ReportPeriod;
  mode?: 'send_now' | 'auto_if_due';
}): Promise<SendFinanceReportResult> {
  const { data, error } = await supabase.functions.invoke('send-finance-report', {
    body: {
      mode: input?.mode ?? 'send_now',
      period: input?.period,
    },
  });
  if (error) {
    throw new Error(error.message || 'Could not send report email.');
  }
  const payload = (data ?? {}) as SendFinanceReportResult;
  if (payload.error) {
    throw new Error(payload.error);
  }
  return payload;
}
