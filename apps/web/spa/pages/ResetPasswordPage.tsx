'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mapAuthError, resetPasswordSchema, type ResetPasswordInput } from '@perakita/shared';
import { supabase } from '@/lib/supabase';
import { AuthShell } from '@/components/AuthShell';
import { useToast } from '@/components/Toast';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        setError('Open the reset link from your email to continue.');
      }
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setError(null);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password: data.password });
    setLoading(false);
    if (updateError) {
      const message = mapAuthError(updateError.message);
      setError(message);
      notify.error(message);
      return;
    }
    notify.success('Password updated');
    navigate('/login', { replace: true });
  };

  return (
    <AuthShell subtitle="Choose a new password for your account." title="Reset password">
      {!ready ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="auth-label" htmlFor="password">
                New password
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
              autoComplete="new-password"
              className="auth-input"
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
              autoComplete="new-password"
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}
          <button className="auth-button" disabled={loading} type="submit">
            {loading ? 'Updating…' : 'Update password'}
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
