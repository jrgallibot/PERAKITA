import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '@perakita/shared';
import { accountRepository } from '@/database/repositories/accountRepository';
import { categoryRepository } from '@/database/repositories/categoryRepository';
import { upsertProfile } from '@/services/settingsService';

export async function seedUserData(userId: string, email?: string | null): Promise<void> {
  await upsertProfile(userId, null, email);

  const categoryCount = await categoryRepository.count(userId);
  if (categoryCount === 0) {
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await categoryRepository.create(userId, {
        name: cat.name,
        type: 'expense',
        icon: cat.icon,
        color: cat.color,
        is_default: true,
      });
    }
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      await categoryRepository.create(userId, {
        name: cat.name,
        type: 'income',
        icon: cat.icon,
        color: cat.color,
        is_default: true,
      });
    }
  }

  await accountRepository.ensureDefaults(userId);
}
