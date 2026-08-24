import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfWeekMonday(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function getPeriodRange(period: ReportPeriod, anchor = new Date()) {
  const base = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (period === "daily") {
    const iso = toIsoDay(base);
    return {
      start: iso,
      end: iso,
      label: base.toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };
  }
  if (period === "weekly") {
    const start = startOfWeekMonday(base);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: toIsoDay(start),
      end: toIsoDay(end),
      label: `Week of ${start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }
  if (period === "yearly") {
    return {
      start: toIsoDay(new Date(base.getFullYear(), 0, 1)),
      end: toIsoDay(new Date(base.getFullYear(), 11, 31)),
      label: String(base.getFullYear()),
    };
  }
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return {
    start: toIsoDay(start),
    end: toIsoDay(end),
    label: base.toLocaleString("en-PH", { month: "long", year: "numeric" }),
  };
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function isReportDue(lastSentAt: string | null, period: ReportPeriod, now = new Date()): boolean {
  if (!lastSentAt) return true;
  const last = new Date(lastSentAt);
  if (Number.isNaN(last.getTime())) return true;
  const range = getPeriodRange(period, now);
  const lastIso = toIsoDay(last);
  // Due when last send was before the current period start
  return lastIso < range.start;
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

async function buildReport(admin: ReturnType<typeof createClient>, userId: string, period: ReportPeriod) {
  const range = getPeriodRange(period);
  const [txRes, budgetRes, spendRes, allTxRes] = await Promise.all([
    admin
      .from("transactions")
      .select("amount, type, transaction_date, category_id, budget_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("transaction_date", range.start)
      .lte("transaction_date", range.end),
    admin
      .from("budgets")
      .select("id, name, total_amount")
      .eq("user_id", userId)
      .is("deleted_at", null),
    admin
      .from("transactions")
      .select("amount, budget_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("type", ["expense", "adjustment"])
      .not("budget_id", "is", null),
    admin
      .from("transactions")
      .select("amount, type")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("type", ["income", "expense"]),
  ]);

  if (txRes.error) throw txRes.error;
  if (budgetRes.error) throw budgetRes.error;
  if (spendRes.error) throw spendRes.error;
  if (allTxRes.error) throw allTxRes.error;

  const periodRows = txRes.data ?? [];
  const income = periodRows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const expenses = periodRows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
  const budgetSpend = periodRows
    .filter((r) => (r.type === "expense" || r.type === "adjustment") && r.budget_id)
    .reduce((s, r) => s + Number(r.amount), 0);
  const balance = (allTxRes.data ?? []).reduce((s, r) => {
    if (r.type === "income") return s + Number(r.amount);
    if (r.type === "expense") return s - Number(r.amount);
    return s;
  }, 0);

  const spendByBudget = new Map<string, number>();
  for (const row of spendRes.data ?? []) {
    const id = row.budget_id as string;
    spendByBudget.set(id, (spendByBudget.get(id) ?? 0) + Number(row.amount));
  }

  const budgets = (budgetRes.data ?? []).map((b) => {
    const spent = spendByBudget.get(b.id as string) ?? 0;
    const total = Number(b.total_amount);
    return {
      name: b.name as string,
      total,
      spent,
      left: Math.max(0, total - spent),
      percent: total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0,
    };
  });

  const text = [
    `PeraKita — Finance report`,
    `Period: ${range.label}`,
    "",
    `Current Balance: ${formatPhp(balance)}`,
    `Income: ${formatPhp(income)}`,
    `Expenses: ${formatPhp(expenses)}`,
    `Net: ${formatPhp(income - expenses)}`,
    `Budget plan spend: ${formatPhp(budgetSpend)}`,
    "",
    ...budgets.map(
      (b) =>
        `• ${b.name}: spent ${formatPhp(b.spent)} of ${formatPhp(b.total)} (${b.percent}%) · left ${formatPhp(b.left)}`,
    ),
    "",
    "Generated by PeraKita",
  ].join("\n");

  const budgetRowsHtml = budgets
    .map(
      (b) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">${b.name}</td><td style="padding:8px 0;border-bottom:1px solid #E2E8F0;text-align:right;">${formatPhp(b.spent)} / ${formatPhp(b.total)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F8FAFC;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" style="max-width:560px;background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
<tr><td>
<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0D9488;">PeraKita report</p>
<h1 style="margin:0 0 8px;font-size:22px;">${range.label}</h1>
<p style="margin:0 0 20px;color:#64748B;font-size:14px;">Your automatic finance summary</p>
<p style="margin:0 0 6px;"><strong>Current Balance:</strong> ${formatPhp(balance)}</p>
<p style="margin:0 0 6px;"><strong>Income:</strong> ${formatPhp(income)}</p>
<p style="margin:0 0 6px;"><strong>Expenses:</strong> ${formatPhp(expenses)}</p>
<p style="margin:0 0 6px;"><strong>Net:</strong> ${formatPhp(income - expenses)}</p>
<p style="margin:0 0 16px;"><strong>Budget spend:</strong> ${formatPhp(budgetSpend)}</p>
${budgets.length ? `<table width="100%" style="font-size:14px;">${budgetRowsHtml}</table>` : "<p style='color:#64748B;font-size:14px;'>No budgets yet.</p>"}
</td></tr></table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;margin-top:16px;">Sent to your PeraKita account email.</p>
</td></tr></table>
</body></html>`;

  return { range, text, html, balance, income, expenses, budgetSpend };
}

async function sendViaResend(to: string, subject: string, text: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set on the Edge Function. Add it in Supabase → Project Settings → Edge Functions → Secrets (see Supabase docs: Sending Emails with Resend).",
    );
  }
  const from = Deno.env.get("REPORT_FROM_EMAIL") ?? "PeraKita <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.message ?? `Resend failed (${res.status})`);
  }
  return payload;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Missing Supabase env on function" }, 500, origin);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user?.email) {
      return json({ error: "Sign in required" }, 401, origin);
    }

    const body = (await req.json().catch(() => ({}))) as {
      period?: ReportPeriod;
      mode?: "send_now" | "auto_if_due";
    };
    const mode = body.mode ?? "send_now";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("report_email_enabled, report_email_period, report_email_last_sent_at, display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const period = (body.period ??
      (profile?.report_email_period as ReportPeriod | undefined) ??
      "monthly") as ReportPeriod;

    if (mode === "auto_if_due") {
      if (!profile?.report_email_enabled) {
        return json({ skipped: true, reason: "auto_email_disabled" }, 200, origin);
      }
      if (!isReportDue(profile.report_email_last_sent_at as string | null, period)) {
        return json({ skipped: true, reason: "already_sent_this_period" }, 200, origin);
      }
    }

    const report = await buildReport(admin, user.id, period);
    const subject = `PeraKita ${report.range.label} report`;
    await sendViaResend(user.email, subject, report.text, report.html);

    await admin
      .from("profiles")
      .update({ report_email_last_sent_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return json(
      {
        ok: true,
        emailed: user.email,
        period,
        label: report.range.label,
      },
      200,
      origin,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send report email";
    return json({ error: message }, 500, origin);
  }
});
