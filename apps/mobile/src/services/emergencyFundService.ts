import { computeEmergencyFundSummary, type EmergencyFundTarget } from '@perakita/shared';
import { emergencyFundRepository } from '@/database/repositories/emergencyFundRepository';
import { transactionRepository } from '@/database/repositories/transactionRepository';

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function loadEmergencyFund(userId: string) {
  const month = monthRange();
  const [fund, totals] = await Promise.all([
    emergencyFundRepository.findByUserId(userId),
    transactionRepository.getMonthlyTotals(userId, month.start, month.end),
  ]);
  const monthlyEssentials = totals.expenses * 0.6;
  return {
    fund,
    monthlyEssentials,
    summary: computeEmergencyFundSummary({
      targetAmount: fund?.target_amount,
      currentAmount: fund?.current_amount,
      recommendedTarget: fund?.recommended_target,
      monthlyEssentials,
    }),
  };
}

export async function saveEmergencyFund(
  userId: string,
  data: { target_amount: number; current_amount: number; recommended_target?: number | null },
): Promise<EmergencyFundTarget> {
  return emergencyFundRepository.upsert(userId, data);
}
