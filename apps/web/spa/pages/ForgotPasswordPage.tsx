'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, mapAuthError, type ForgotPasswordInput } from '@perakita/shared';
import { isSupabaseConfigured } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/profile';
import { AuthShell } from '@/components/AuthShell';
import { useToast } from '@/components/Toast';

export function ForgotPasswordPage() {
  const notify = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordInput) => {
    if (!isSupabaseConfigured) {
      const message = 'Supabase is not configured.';
      setError(message);
      notify.error(message);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      await sendPasswordResetEmail(data.email, redirectTo);
      setSent(true);
      notify.success('Reset email sent');
    } catch (err) {
      const message = mapAuthError(err instanceof Error ? err.message : 'Could not send reset email');
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      subtitle={
        sent
          ? 'Check your inbox for a link to choose a new password.'
          : 'Enter your email and we will send reset instructions.'
      }
      title="Forgot password"
    >
      {sent ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          If an account exists for that email, a reset link is on the way. The link opens this site so
          you can set a new password.
        </p>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}
          <button className="auth-button" disabled={loading} type="submit">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        <Link className="font-semibold text-primary hover:underline" to="/login">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
