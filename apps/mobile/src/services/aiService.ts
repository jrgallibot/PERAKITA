import {
  answerPesoChat,
  generatePesoInsight,
  stripPesoAiDisclaimer,
  type GoalChatInsight,
} from '@perakita/shared';
import { loadPesoDashboard } from '@/services/pesoEngineService';
import { loadGoalsDashboard } from '@/services/savingsGoalService';

/** Local PeraKita AI — runs on-device from your PESO snapshot (no third-party API). */
export async function fetchAiInsight(userId: string): Promise<string | null> {
  const snapshot = await loadPesoDashboard(userId);
  const raw = generatePesoInsight(snapshot);
  const body = stripPesoAiDisclaimer(raw);
  return body || null;
}

function buildGoalInsights(userId: string): Promise<GoalChatInsight[]> {
  return loadGoalsDashboard(userId).then(({ enriched }) =>
    enriched
      .filter((item) => !item.goal.is_archived)
      .map((item) => ({
        name: item.goal.name,
        current: item.goal.current_amount,
        target: item.goal.target_amount,
        remaining: item.calculations.remainingAmount,
        requiredDaily: item.calculations.requiredDailySavings,
        currentDailyRate: item.forecast.currentDailySavingsRate,
        status: item.status,
        projectedCompletionDate: item.forecast.projectedCompletionDate,
      })),
  );
}

/** Local PeraKita AI chat — rule-based answers from your recorded finances. */
export async function sendAiChat(userId: string, message: string): Promise<string> {
  const [snapshot, goalInsights] = await Promise.all([
    loadPesoDashboard(userId),
    buildGoalInsights(userId),
  ]);
  const raw = answerPesoChat(message, snapshot, goalInsights);
  return stripPesoAiDisclaimer(raw);
}
