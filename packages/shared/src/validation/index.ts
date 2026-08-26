import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    displayName: z.string().max(100).optional(),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must accept the terms to continue',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export const sexSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name is too long'),
  contact: z.string().trim().max(40, 'Contact is too long').optional().or(z.literal('')),
  address: z.string().trim().max(300, 'Address is too long').optional().or(z.literal('')),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  sex: sexSchema.optional().nullable(),
});

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['cash', 'ewallet', 'bank', 'savings', 'emergency', 'other']),
  initial_balance: z.number(),
  currency: z.string().default('PHP'),
});

export const transactionSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  budget_id: z.string().uuid().nullable().optional(),
  type: z.enum([
    'income',
    'expense',
    'transfer',
    'loan_received',
    'loan_given',
    'loan_payment',
    'debt_payment',
    'adjustment',
  ]),
  amount: z.number().positive('Amount must be greater than zero'),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  transaction_date: z.string(),
  payment_method: z.string().max(50).nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;

export const incomeFrequencySchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'custom',
]);

export const recurringFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'custom']);

export const onboardingSchema = z.object({
  display_name: z.string().trim().min(1, 'Name is required').max(100),
  currency: z.string().default('PHP'),
  current_money: z.number().min(0, 'Amount cannot be negative'),
  income_source: z.string().trim().min(1, 'Income source is required').max(100),
  income_amount: z.number().positive('Income amount must be greater than zero'),
  income_frequency: incomeFrequencySchema,
  next_payday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
});

export const recurringExpenseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  category_id: z.string().uuid().nullable().optional(),
  frequency: recurringFrequencySchema,
  custom_interval_days: z.number().int().positive().nullable().optional(),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_method: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const savingsGoalCategorySchema = z.enum([
  'emergency_fund',
  'phone',
  'laptop',
  'vacation',
  'tuition',
  'wedding',
  'house',
  'motorcycle',
  'car',
  'business',
  'other',
]);

export const savingsGoalSchema = z
  .object({
    name: z.string().trim().min(1, 'Goal name is required').max(100),
    category: savingsGoalCategorySchema,
    icon: z.string().min(1).max(80).default('flag-outline'),
    target_amount: z.number().positive('Target amount must be greater than zero'),
    current_amount: z.number().min(0, 'Current amount cannot be negative').default(0),
    target_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .nullable()
      .optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    description: z.string().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.current_amount > data.target_amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current amount cannot exceed target amount',
        path: ['current_amount'],
      });
    }
    if (data.target_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(`${data.target_date}T00:00:00`);
      if (Number.isNaN(target.getTime()) || target <= today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target date must be in the future',
          path: ['target_date'],
        });
      }
    }
  });

export const savingsContributionSchema = z.object({
  goal_id: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than zero'),
  contribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  source: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const emergencyFundSchema = z.object({
  target_amount: z.number().min(0),
  current_amount: z.number().min(0).default(0),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type SavingsContributionInput = z.infer<typeof savingsContributionSchema>;
export type EmergencyFundInput = z.infer<typeof emergencyFundSchema>;

/** Age in whole years from birthday ISO date, or null if invalid. */
export function ageFromBirthday(birthday: string | null | undefined): number | null {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
  const [y, m, d] = birthday.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (lower.includes('password')) {
    return 'Password does not meet requirements.';
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}
