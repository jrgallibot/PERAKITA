'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, mapAuthError, type RegisterInput } from '@perakita/shared';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AuthShell } from '@/components/AuthShell';
import { useToast } from '@/components/Toast';

export function RegisterPage() {
  const notify = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    if (!isSupabaseConfigured) {
      const message = 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.';
      setError(message);
      notify.error(message);
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { display_name: data.displayName } },
    });
    setLoading(false);
    if (authError) {
      const message = mapAuthError(authError.message);
      setError(message);
      notify.error(message);
      return;
    }
    notify.success('Account created');
    setSuccess(true);
  };

  if (success) {
    return (
      <AuthShell subtitle="Confirm your email, then come back to sign in." title="Check your inbox">
        <p className="mb-6 text-[15px] leading-6 text-[var(--muted)]">
          We sent a verification link to your email. After you confirm it, you can start tracking
          expenses, budgets, and loans.
        </p>
        <Link className="auth-button inline-block text-center" to="/login">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Create your account in under a minute." title="Get started">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="auth-label" htmlFor="displayName">
            Full name
          </label>
          <input
            id="displayName"
            className="auth-input"
            placeholder="Juan Dela Cruz"
            {...register('displayName')}
          />
        </div>
        <div>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            autoComplete="email"
            className="auth-input"
            placeholder="you@email.com"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="password">
              Password
            </label>
            <button
              className="text-xs font-semibold text-primary"
              onClick={() => setShowPassword((v) => !v)}
              type="button"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="password"
            className="auth-input"
            placeholder="At least 8 characters"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label className="auth-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            className="auth-input"
            placeholder="Repeat password"
            type={showPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>
        <label className="flex items-start gap-3 text-sm leading-5 text-[var(--muted)]">
          <input
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            type="checkbox"
            {...register('acceptTerms')}
          />
          I agree to the Terms of Service and Privacy Policy
        </label>
        {errors.acceptTerms && (
          <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        <button className="auth-button" disabled={loading} type="submit">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link className="font-semibold text-primary hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
