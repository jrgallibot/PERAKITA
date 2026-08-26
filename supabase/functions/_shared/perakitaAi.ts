// Keep in sync with packages/shared/src/peso/localAi.ts

const PESO_AI_DISCLAIMER =
  "Educational insights based on your recorded data. Not professional financial advice.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Snapshot = any;

function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function withDisclaimer(text: string): string {
  return `${text.trim()}\n\n${PESO_AI_DISCLAIMER}`;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[₱,]/g, "").trim();
}

function parseAmount(text: string): number | null {
  const match = text.match(/(?:₱\s*)?(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function formatBillList(snapshot: Snapshot): string {
  const bills = snapshot.upcomingBills ?? [];
  if (bills.length === 0) {
    return "You have no upcoming bills recorded in the next 30 days.";
  }
  const lines = bills.slice(0, 5).map(
    (bill: { name: string; amount: number; due_date: string }) =>
      `${bill.name} (${formatPhp(bill.amount)} due ${bill.due_date})`,
  );
  const total = bills.reduce((sum: number, bill: { amount: number }) => sum + bill.amount, 0);
  return `${lines.join("; ")}. Total upcoming: ${formatPhp(total)}.`;
}

export function generatePesoInsight(snapshot: Snapshot): string {
  const insights: string[] = [];

  if (snapshot.forecast?.runsOutBeforePayday && snapshot.forecast?.warning) {
    insights.push(snapshot.forecast.warning);
  } else if (
    snapshot.forecast?.daysUntilZero != null && snapshot.forecast.daysUntilZero <= 7
  ) {
    insights.push(
      `At your current pace, your balance may run low in about ${snapshot.forecast.daysUntilZero} day(s). Consider slowing discretionary spending until payday.`,
    );
  }

  if (snapshot.spendingRisk?.detected && snapshot.spendingRisk?.message) {
    insights.push(snapshot.spendingRisk.message);
  }

  if (snapshot.safeToSpendToday <= 0) {
    insights.push(
      `Your safe-to-spend today is ${formatPhp(0)} after bills and commitments. Avoid non-essential spending until income arrives.`,
    );
  } else if (snapshot.safeToSpendToday < snapshot.avgDailySpend * 0.5) {
    insights.push(
      `You can safely spend about ${formatPhp(snapshot.safeToSpendToday)} today — below your recent daily average of ${formatPhp(snapshot.avgDailySpend)}.`,
    );
  }

  if (snapshot.upcomingCommitments > 0 && snapshot.realAvailable < snapshot.upcomingCommitments) {
    insights.push(
      `Upcoming commitments (${formatPhp(snapshot.upcomingCommitments)}) exceed your real available cash (${formatPhp(snapshot.realAvailable)}). Prioritize essentials.`,
    );
  }

  if (snapshot.totalDebt > 0 && snapshot.monthlyIncome > 0) {
    const debtRatio = snapshot.totalDebt / snapshot.monthlyIncome;
    if (debtRatio > 3) {
      insights.push(
        `Outstanding debt (${formatPhp(snapshot.totalDebt)}) is high relative to monthly income. Focus on minimum payments and avoid new debt.`,
      );
    }
  }

  if (snapshot.healthScore?.needsImprovement?.length > 0 && insights.length < 3) {
    insights.push(`Focus area: ${snapshot.healthScore.needsImprovement[0]}.`);
  }

  if (insights.length === 0 && snapshot.healthScore?.strong?.length > 0) {
    insights.push(
      `You're doing well on ${snapshot.healthScore.strong[0].toLowerCase()}. Keep it up!`,
    );
  }

  if (insights.length === 0) {
    insights.push(
      `You have ${formatPhp(snapshot.realAvailable)} truly available with ${snapshot.daysUntilPayday} day(s) until payday. Safe to spend today: ${formatPhp(snapshot.safeToSpendToday)}.`,
    );
  }

  return withDisclaimer(insights.slice(0, 3).join(" "));
}

export function answerPesoChat(message: string, snapshot: Snapshot): string {
  const text = normalize(message);
  const amount = parseAmount(message);

  if (!text) {
    return withDisclaimer(
      "Ask me about your balance, bills, spending, savings, or whether you can afford a purchase.",
    );
  }

  if (/afford|can i spend|safe to spend|spend today|pwede ba|kaya ba/.test(text)) {
    const target = amount ?? snapshot.safeToSpendToday;
    if (target <= snapshot.safeToSpendToday) {
      return withDisclaimer(
        `Yes — ${formatPhp(target)} fits within today's safe-to-spend limit of ${formatPhp(snapshot.safeToSpendToday)}. You still have ${formatPhp(snapshot.realAvailable)} truly available overall.`,
      );
    }
    return withDisclaimer(
      `${formatPhp(target)} is above today's safe-to-spend limit of ${formatPhp(snapshot.safeToSpendToday)}. Real available cash is ${formatPhp(snapshot.realAvailable)} — consider waiting or trimming other spending.`,
    );
  }

  if (/where.*money|most.*spent|spending|expenses|gastos|nagastos/.test(text)) {
    return withDisclaimer(
      `This month you've spent ${formatPhp(snapshot.monthlyExpenses)} against income of ${formatPhp(snapshot.monthlyIncome)}. Your recent daily average is ${formatPhp(snapshot.avgDailySpend)}.`,
    );
  }

  if (/bill|bills|due|bayarin|upcoming/.test(text)) {
    return withDisclaimer(formatBillList(snapshot));
  }

  if (/savings|goal|ipon|mag-ipon/.test(text)) {
    return withDisclaimer(
      `Total savings recorded: ${formatPhp(snapshot.totalSavings)}. Planned savings in your budget: ${formatPhp(snapshot.plannedSavings)}. Track goals in the Goals tab to see progress toward each target.`,
    );
  }

  if (/debt|utang|loan/.test(text)) {
    if (snapshot.totalDebt <= 0) {
      return withDisclaimer("You have no active debt recorded. Great job staying debt-free!");
    }
    return withDisclaimer(
      `Active debt total: ${formatPhp(snapshot.totalDebt)}. Keep payments on schedule and avoid adding new balances before payday.`,
    );
  }

  if (/payday|sweldo|sahod|kailan.*bayad/.test(text)) {
    return withDisclaimer(
      `Payday is in ${snapshot.daysUntilPayday} day(s). Safe to spend today: ${formatPhp(snapshot.safeToSpendToday)} spread across those days.`,
    );
  }

  if (/balance|available|pera|magkano.*natira|real available/.test(text)) {
    return withDisclaimer(
      `Current balance: ${formatPhp(snapshot.currentBalance)}. After upcoming commitments, real available is ${formatPhp(snapshot.realAvailable)}. Safe to spend today: ${formatPhp(snapshot.safeToSpendToday)}.`,
    );
  }

  if (/health|score|doing ok|okay ba|kalagayan/.test(text)) {
    const strong = snapshot.healthScore?.strong?.length
      ? `Strengths: ${snapshot.healthScore.strong.join(", ")}.`
      : "";
    const needs = snapshot.healthScore?.needsImprovement?.length
      ? `Improve: ${snapshot.healthScore.needsImprovement.join(", ")}.`
      : "";
    return withDisclaimer(
      `Financial health score: ${snapshot.healthScore.score}/100. ${strong} ${needs}`.trim(),
    );
  }

  if (/forecast|run out|ubos|maubos|zero/.test(text)) {
    if (snapshot.forecast?.warning) {
      return withDisclaimer(snapshot.forecast.warning);
    }
    if (snapshot.forecast?.daysUntilZero == null) {
      return withDisclaimer(
        `Projected balance at payday: ${formatPhp(snapshot.forecast.projectedBalance)}. No shortfall detected before then.`,
      );
    }
    return withDisclaimer(
      `At current spending, balance may reach zero in about ${snapshot.forecast.daysUntilZero} day(s). Projected balance at payday: ${formatPhp(snapshot.forecast.projectedBalance)}.`,
    );
  }

  if (/help|ano.*tanong|what can/.test(text)) {
    return withDisclaimer(
      'Try asking: "Can I afford ₱500 today?", "Where did my money go?", "What bills are coming?", or "How is my financial health?"',
    );
  }

  return withDisclaimer(
    `Snapshot: ${formatPhp(snapshot.realAvailable)} available, ${formatPhp(snapshot.safeToSpendToday)} safe today, payday in ${snapshot.daysUntilPayday} day(s). Monthly spend ${formatPhp(snapshot.monthlyExpenses)} vs income ${formatPhp(snapshot.monthlyIncome)}. Ask about bills, debt, savings, or whether a specific amount is affordable.`,
  );
}
