'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  APP_ABOUT,
  APP_ABOUT_POINTS,
  APP_CREDIT,
  APP_NAME,
  ageFromBirthday,
  changePasswordSchema,
  mapAuthError,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
  type ThemeMode,
} from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { useToast } from '@/components/Toast';
import { useWebTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/spa/AuthProvider';
import { clearWebFinanceData, resetWebCurrentBalance } from '@/lib/finance';
import {
  changePassword,
  ensureProfile,
  updateProfile,
  uploadAvatar,
} from '@/lib/profile';


const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const SEX_OPTIONS = [
  { label: 'Prefer not to say', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
] as const;

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { mode, setMode, resolved } = useWebTheme();
  const notify = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resettingBalance, setResettingBalance] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      contact: '',
      address: '',
      birthday: '',
      sex: null,
    },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const birthday = profileForm.watch('birthday');
  const age = useMemo(() => ageFromBirthday(birthday || null), [birthday]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setProfileLoading(true);
    void (async () => {
      try {
        const profile = await ensureProfile(user.id, user.email);
        if (cancelled) return;
        profileForm.reset({
          display_name: profile.display_name ?? '',
          contact: profile.contact ?? '',
          address: profile.address ?? '',
          birthday: profile.birthday ?? '',
          sex: profile.sex,
        });
        setAvatarUrl(profile.avatar_url);
      } catch (err) {
        if (!cancelled) {
          notify.error(err instanceof Error ? err.message : 'Could not load profile');
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  const onSaveProfile = profileForm.handleSubmit(async (data) => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      const profile = await updateProfile(user.id, data);
      setAvatarUrl(profile.avatar_url);
      notify.success('Profile saved');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (data) => {
    if (!user?.email) return;
    setSavingPassword(true);
    try {
      await changePassword(user.email, data.currentPassword, data.newPassword);
      passwordForm.reset();
      notify.success('Password updated');
    } catch (err) {
      notify.error(mapAuthError(err instanceof Error ? err.message : 'Could not update password'));
    } finally {
      setSavingPassword(false);
    }
  });

  const onAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) {
      notify.error('Choose an image file');
      return;
    }
    setUploadingAvatar(true);
    try {
      await ensureProfile(user.id, user.email);
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      notify.success('Profile photo updated');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = (profileForm.watch('display_name') || user?.email || '?')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const onResetBalance = async () => {
    if (!user?.id || resettingBalance) return;
    const confirmed = window.confirm(
      'Reset Current Balance to ₱0? This deletes your income and expense records for this account. Loans and budgets stay.'
    );
    if (!confirmed) return;
    setResettingBalance(true);
    try {
      await resetWebCurrentBalance(user.id);
      notify.success('Current Balance reset to ₱0');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not reset balance');
    } finally {
      setResettingBalance(false);
    }
  };

  const onClearAllData = async () => {
    if (!user?.id || clearingData) return;
    const confirmed = window.confirm(
      'Clear ALL your financial data? This permanently removes loans, budgets, expenses, income, and resets Current Balance for your account only.'
    );
    if (!confirmed) return;
    const typed = window.prompt('Type CLEAR to confirm deleting all your loans, budgets, and expenses.');
    if (typed !== 'CLEAR') {
      if (typed != null) notify.info('Clear cancelled — type CLEAR exactly to confirm.');
      return;
    }
    setClearingData(true);
    try {
      await clearWebFinanceData(user.id);
      notify.success('All financial data cleared');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not clear data');
    } finally {
      setClearingData(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-2 text-[var(--muted)]">Profile, security, and appearance.</p>

        <section className="mt-8 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Profile</p>
          {profileLoading ? (
            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={onSaveProfile}>
              <div className="flex items-center gap-4">
                <button
                  className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--background)]"
                  onClick={() => fileRef.current?.click()}
                  type="button"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Profile" className="h-full w-full object-cover" src={avatarUrl} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                      {initials}
                    </span>
                  )}
                </button>
                <div>
                  <p className="text-sm font-semibold">Profile photo</p>
                  <p className="text-xs text-[var(--muted)]">Tap the circle to upload a new picture.</p>
                  <button
                    className="mt-2 text-sm font-semibold text-primary"
                    disabled={uploadingAvatar}
                    onClick={() => fileRef.current?.click()}
                    type="button"
                  >
                    {uploadingAvatar ? 'Uploading…' : 'Change photo'}
                  </button>
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarChange}
                    ref={fileRef}
                    type="file"
                  />
                </div>
              </div>

              <div>
                <label className="auth-label" htmlFor="display_name">
                  Full name
                </label>
                <input id="display_name" className="auth-input" {...profileForm.register('display_name')} />
                {profileForm.formState.errors.display_name ? (
                  <p className="mt-1 text-sm text-red-500">
                    {profileForm.formState.errors.display_name.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="auth-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="auth-input opacity-80"
                  disabled
                  readOnly
                  value={user?.email ?? ''}
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Email is managed by your sign-in account.
                </p>
              </div>

              <div>
                <label className="auth-label" htmlFor="contact">
                  Contact number
                </label>
                <input id="contact" className="auth-input" {...profileForm.register('contact')} />
              </div>

              <div>
                <label className="auth-label" htmlFor="address">
                  Address
                </label>
                <textarea
                  id="address"
                  className="auth-input min-h-[88px] resize-y"
                  {...profileForm.register('address')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="auth-label" htmlFor="birthday">
                    Birthday
                  </label>
                  <input
                    id="birthday"
                    className="auth-input"
                    type="date"
                    {...profileForm.register('birthday')}
                  />
                  {age != null ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">Age: {age}</p>
                  ) : null}
                </div>
                <div>
                  <label className="auth-label" htmlFor="sex">
                    Sex
                  </label>
                  <select
                    id="sex"
                    className="auth-input"
                    value={profileForm.watch('sex') ?? ''}
                    onChange={(event) =>
                      profileForm.setValue(
                        'sex',
                        event.target.value
                          ? (event.target.value as NonNullable<ProfileInput['sex']>)
                          : null
                      )
                    }
                  >
                    {SEX_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="auth-button" disabled={savingProfile} type="submit">
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          )}
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Security</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Change your password while signed in.</p>
          <form className="mt-4 space-y-4" onSubmit={onChangePassword}>
            <div>
              <label className="auth-label" htmlFor="currentPassword">
                Current password
              </label>
              <input
                id="currentPassword"
                autoComplete="current-password"
                className="auth-input"
                type="password"
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword ? (
                <p className="mt-1 text-sm text-red-500">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="auth-label" htmlFor="newPassword">
                New password
              </label>
              <input
                id="newPassword"
                autoComplete="new-password"
                className="auth-input"
                type="password"
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword ? (
                <p className="mt-1 text-sm text-red-500">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="auth-label" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                autoComplete="new-password"
                className="auth-input"
                type="password"
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword ? (
                <p className="mt-1 text-sm text-red-500">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
            <button className="auth-button" disabled={savingPassword} type="submit">
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Forgot your password?{' '}
            <Link className="font-semibold text-primary hover:underline" to="/forgot-password">
              Send a reset email
            </Link>
          </p>
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Appearance</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Currently {resolved === 'dark' ? 'dark' : 'light'}
            {mode === 'system' ? ' (following your device)' : ''}.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => {
              const selected = mode === option.value;
              return (
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    selected
                      ? 'border-primary bg-primary text-white dark:text-slate-950'
                      : 'border-[var(--border)] text-[var(--foreground)]'
                  }`}
                  key={option.value}
                  onClick={() => {
                    setMode(option.value);
                    notify.info(`${option.label} theme applied`);
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-red-500/30 bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Your data
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            These actions only affect your signed-in account. They soft-delete records in this session&apos;s
            cloud data and cannot be undone from the app.
          </p>
          <div className="mt-4 space-y-3">
            <button
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
              disabled={resettingBalance || clearingData}
              onClick={() => void onResetBalance()}
              type="button"
            >
              {resettingBalance ? 'Resetting…' : 'Reset Current Balance'}
            </button>
            <p className="text-xs text-[var(--muted)]">
              Deletes income and expenses that make up Current Balance and sets payment modes to ₱0. Loans
              and budgets are kept.
            </p>
            <button
              className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300 disabled:opacity-60"
              disabled={resettingBalance || clearingData}
              onClick={() => void onClearAllData()}
              type="button"
            >
              {clearingData ? 'Clearing…' : 'Clear all loans, budgets & expenses'}
            </button>
            <p className="text-xs text-[var(--muted)]">
              Removes loans, budgets, expenses, income, and loan payments, then resets Current Balance.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card dark:shadow-card-dark">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            About {APP_NAME}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{APP_ABOUT}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
            {APP_ABOUT_POINTS.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--muted)]">{APP_CREDIT}</p>
        </section>

        <button
          className="mt-6 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
