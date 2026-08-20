'use client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, mapAuthError, type LoginInput } from '@perakita/shared';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AuthShell } from '@/components/AuthShell';
import { useToast } from '@/components/Toast';

export function LoginPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    if (!isSupabaseConfigured) {
      const message = 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.';
      setError(message);
      notify.error(message);
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword(data);
    setLoading(false);
    if (authError) {
      const message = mapAuthError(authError.message);
      setError(message);
      notify.error(message);
      return;
    }
    notify.success('Signed in');
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthShell subtitle="Sign in to continue tracking your money." title="Welcome back">
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
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="password">
              Password
            </label>
            <div className="flex items-center gap-3">
              <Link className="text-xs font-semibold text-primary hover:underline" to="/forgot-password">
                Forgot?
              </Link>
              <button
                className="text-xs font-semibold text-primary"
                onClick={() => setShowPassword((v) => !v)}
                type="button"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <input
            id="password"
            autoComplete="current-password"
            className="auth-input"
            placeholder="Enter your password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        <button className="auth-button" disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Don&apos;t have an account?{' '}
        <Link className="font-semibold text-primary hover:underline" to="/register">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
