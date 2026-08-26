import type { PesoDashboardSnapshot } from './types';
import { PESO_AI_DISCLAIMER } from './types';
import type { GoalStatus } from './types';
import {
  formatGoalStatusEmoji,
  goalStatusLabel,
} from './savingsGoals';

export interface GoalChatInsight {
  name: string;
  current: number;
  target: number;
  remaining: number;
  requiredDaily: number;
  currentDailyRate: number | null;
  status: GoalStatus;
  projectedCompletionDate: string | null;
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function withDisclaimer(text: string): string {
  return `${text.trim()}\n\n${PESO_AI_DISCLAIMER}`;
}

/** Remove the standard disclaimer suffix for UI display (chat bubbles, cards). */
export function stripPesoAiDisclaimer(text: string): string {
  const trimmed = text.trim();
  const suffix = `\n\n${PESO_AI_DISCLAIMER}`;
  if (trimmed.endsWith(suffix)) return trimmed.slice(0, -suffix.length).trim();
  return trimmed.replace(PESO_AI_DISCLAIMER, '').trim();
}

export const PESO_AI_SUGGESTIONS = [
  'Can I afford to spend ₱500 today?',
  'Where did most of my money go?',
  'What bills are coming up?',
  'How is my financial health?',
  'How can I reach my savings goal?',
  'Why is my balance going down quickly?',
] as const;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[₱,]/g, '').trim();
}

function parseAmount(text: string): number | null {
  const normalized = text.replace(/,/g, '');
  const match = normalized.match(/(?:₱\s*)?(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function formatBillList(snapshot: PesoDashboardSnapshot): string {
  if (snapshot.upcomingBills.length === 0) {
    return 'You have no upcoming bills recorded in the next 30 days.';
  }
  const lines = snapshot.upcomingBills.slice(0, 5).map(
    (bill) => `${bill.name} (${formatPhp(bill.amount)} due ${bill.due_date})`,
  );
  const total = snapshot.upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);
  return `${lines.join('; ')}. Total upcoming: ${formatPhp(total)}.`;
}

/** Rule-based insight card text from a PESO dashboard snapshot. */
export function generatePesoInsight(snapshot: PesoDashboardSnapshot): string {
  const insights: string[] = [];

  if (snapshot.forecast.runsOutBeforePayday && snapshot.forecast.warning) {
    insights.push(snapshot.forecast.warning);
  } else if (snapshot.forecast.daysUntilZero != null && snapshot.forecast.daysUntilZero <= 7) {
    insights.push(
      `At your current pace, your balance may run low in about ${snapshot.forecast.daysUntilZero} day(s). Consider slowing discretionary spending until payday.`,
    );
  }

  if (snapshot.spendingRisk.detected && snapshot.spendingRisk.message) {
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

  if (snapshot.healthScore.needsImprovement.length > 0 && insights.length < 3) {
    insights.push(`Focus area: ${snapshot.healthScore.needsImprovement[0]}.`);
  }

  if (insights.length === 0 && snapshot.healthScore.strong.length > 0) {
    insights.push(`You're doing well on ${snapshot.healthScore.strong[0].toLowerCase()}. Keep it up!`);
  }

  if (insights.length === 0) {
    insights.push(
      `You have ${formatPhp(snapshot.realAvailable)} truly available with ${snapshot.daysUntilPayday} day(s) until payday. Safe to spend today: ${formatPhp(snapshot.safeToSpendToday)}.`,
    );
  }

  return withDisclaimer(insights.slice(0, 3).join(' '));
}

/** Rule-based chat replies from a user question and PESO snapshot. */
export function answerPesoChat(
  message: string,
  snapshot: PesoDashboardSnapshot,
  goalInsights: GoalChatInsight[] = [],
): string {
  const text = normalize(message);
  const amount = parseAmount(message);

  if (!text) {
    return withDisclaimer('Ask me about your balance, bills, spending, savings, or whether you can afford a purchase.');
  }

  if (/^(hi|hello|hey|kumusta|magandang)/.test(text)) {
    return withDisclaimer(
      `Hi! I'm your PeraKita assistant. You have ${formatPhp(snapshot.realAvailable)} available and ${formatPhp(snapshot.safeToSpendToday)} safe to spend today. What would you like to know?`,
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

  if (/budget|badyet|overspend|over budget|lumampas/.test(text)) {
    const spendRatio =
      snapshot.monthlyIncome > 0 ? snapshot.monthlyExpenses / snapshot.monthlyIncome : 0;
    if (spendRatio >= 1) {
      return withDisclaimer(
        `You've spent ${formatPhp(snapshot.monthlyExpenses)} against income of ${formatPhp(snapshot.monthlyIncome)} — at or over your monthly inflow. Review category budgets in the Budget tab.`,
      );
    }
    if (spendRatio >= 0.8) {
      return withDisclaimer(
        `You've used about ${Math.round(spendRatio * 100)}% of this month's income on expenses (${formatPhp(snapshot.monthlyExpenses)} of ${formatPhp(snapshot.monthlyIncome)}). Tighten discretionary spending if needed.`,
      );
    }
    return withDisclaimer(
      `Monthly spend is ${formatPhp(snapshot.monthlyExpenses)} vs income ${formatPhp(snapshot.monthlyIncome)}. Open the Budget tab to review category limits.`,
    );
  }

  if (/bill|bills|due|bayarin|upcoming/.test(text)) {
    return withDisclaimer(formatBillList(snapshot));
  }

  if (/savings|goal|ipon|mag-ipon/.test(text)) {
    const matchedGoal =
      goalInsights.find((g) => text.includes(g.name.toLowerCase())) ??
      goalInsights.find((g) => /phone|laptop|vacation|emergency|tuition|wedding|house|car|business/.test(text)) ??
      goalInsights[0];

    if (matchedGoal) {
      const rateLine =
        matchedGoal.currentDailyRate != null
          ? `You're currently saving about ${formatPhp(matchedGoal.currentDailyRate)}/day, but need approximately ${formatPhp(Math.ceil(matchedGoal.requiredDaily))}/day to reach your goal on time.`
          : `You need approximately ${formatPhp(Math.ceil(matchedGoal.requiredDaily))}/day to reach this goal on time.`;
      const statusLine = `Your goal is ${goalStatusLabel(matchedGoal.status).toLowerCase()} (${formatGoalStatusEmoji(matchedGoal.status)}).`;
      const projectionLine = matchedGoal.projectedCompletionDate
        ? ` Projected completion: ${matchedGoal.projectedCompletionDate}.`
        : '';
      const gap =
        matchedGoal.currentDailyRate != null &&
        matchedGoal.requiredDaily > matchedGoal.currentDailyRate
          ? ` Reducing discretionary spending by about ${formatPhp(Math.ceil(matchedGoal.requiredDaily - matchedGoal.currentDailyRate))}/day could help you stay on track.`
          : '';
      return withDisclaimer(
        `${matchedGoal.name}: ${formatPhp(matchedGoal.current)} of ${formatPhp(matchedGoal.target)} saved (${formatPhp(matchedGoal.remaining)} remaining). ${rateLine} ${statusLine}${projectionLine}${gap}`,
      );
    }

    return withDisclaimer(
      `Total savings recorded: ${formatPhp(snapshot.totalSavings)}. Planned savings in your budget: ${formatPhp(snapshot.plannedSavings)}. Track goals in the Goals tab to see progress toward each target.`,
    );
  }

  if (/debt|utang|loan/.test(text)) {
    if (snapshot.totalDebt <= 0) {
      return withDisclaimer('You have no active debt recorded. Great job staying debt-free!');
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
    const strong =
      snapshot.healthScore.strong.length > 0
        ? `Strengths: ${snapshot.healthScore.strong.join(', ')}.`
        : '';
    const needs =
      snapshot.healthScore.needsImprovement.length > 0
        ? `Improve: ${snapshot.healthScore.needsImprovement.join(', ')}.`
        : '';
    return withDisclaimer(
      `Financial health score: ${snapshot.healthScore.score}/100. ${strong} ${needs}`.trim(),
    );
  }

  if (/forecast|run out|ubos|maubos|zero/.test(text)) {
    if (snapshot.forecast.warning) {
      return withDisclaimer(snapshot.forecast.warning);
    }
    if (snapshot.forecast.daysUntilZero == null) {
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
