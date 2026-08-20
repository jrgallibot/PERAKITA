'use client';

import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  APP_ABOUT,
  APP_ABOUT_POINTS,
  APP_CONCEPT,
  APP_CONCEPT_TITLE,
  APP_CREDIT,
  APP_FAQ,
  APP_NAME,
  APP_TAGLINE,
  APP_WORKFLOW,
} from '@perakita/shared';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/spa/AuthProvider';

function HeroLedgerArt() {
  return (
    <svg
      aria-hidden
      className="landing-hero-art h-full w-full"
      fill="none"
      viewBox="0 0 720 560"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lgPanel" x1="80" x2="640" y1="40" y2="520" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ECFDF8" />
          <stop offset="1" stopColor="#CCFBF1" />
        </linearGradient>
        <linearGradient id="lgBar" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#0D9488" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect fill="url(#lgPanel)" height="480" rx="28" width="560" x="80" y="40" />
      <rect fill="#0F766E" height="56" rx="28" width="560" x="80" y="40" opacity="0.95" />
      <circle cx="118" cy="68" fill="#5EEAD4" r="8" />
      <circle cx="146" cy="68" fill="#99F6E4" r="8" />
      <circle cx="174" cy="68" fill="#F0FDFA" r="8" />
      <text fill="#F0FDFA" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="18" fontWeight="700" x="210" y="74">
        Current Balance
      </text>
      <text fill="#0F172A" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="42" fontWeight="800" x="120" y="160">
        ₱24,850.00
      </text>
      <text fill="#64748B" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="14" x="120" y="188">
        Offline ledger · synced when online
      </text>
      <rect fill="#FFFFFF" height="72" rx="16" width="240" x="120" y="220" opacity="0.9" />
      <text fill="#0D9488" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="13" fontWeight="600" x="140" y="250">
        Income
      </text>
      <text fill="#0F172A" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="22" fontWeight="700" x="140" y="278">
        ₱8,200
      </text>
      <rect fill="#FFFFFF" height="72" rx="16" width="240" x="380" y="220" opacity="0.9" />
      <text fill="#0D9488" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="13" fontWeight="600" x="400" y="250">
        Expenses
      </text>
      <text fill="#0F172A" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="22" fontWeight="700" x="400" y="278">
        ₱3,140
      </text>
      <rect fill="url(#lgBar)" height="120" rx="8" width="36" x="150" y="340" className="landing-bar landing-bar-1" />
      <rect fill="url(#lgBar)" height="88" rx="8" width="36" x="210" y="372" className="landing-bar landing-bar-2" opacity="0.85" />
      <rect fill="url(#lgBar)" height="150" rx="8" width="36" x="270" y="310" className="landing-bar landing-bar-3" />
      <rect fill="url(#lgBar)" height="64" rx="8" width="36" x="330" y="396" className="landing-bar landing-bar-4" opacity="0.75" />
      <rect fill="url(#lgBar)" height="108" rx="8" width="36" x="390" y="352" className="landing-bar landing-bar-5" opacity="0.9" />
      <rect fill="url(#lgBar)" height="78" rx="8" width="36" x="450" y="382" className="landing-bar landing-bar-6" opacity="0.8" />
      <rect fill="#0F766E" height="44" rx="22" width="160" x="520" y="460" opacity="0.92" />
      <text fill="#ECFDF8" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="14" fontWeight="700" x="552" y="487">
        Sync Now
      </text>
    </svg>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-[var(--border)]">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 py-5 text-left transition hover:text-primary"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="text-base font-semibold leading-snug text-[var(--foreground)] sm:text-lg">{question}</span>
        <span
          aria-hidden
          className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center text-primary transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        id={panelId}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pr-10 text-[15px] leading-7 text-[var(--muted)]">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { session } = useAuth();
  const primaryHref = session ? '/dashboard' : '/register';
  const primaryLabel = session ? 'Open dashboard' : 'Get started';
  const secondaryHref = session ? '/manage' : '/login';
  const secondaryLabel = session ? 'Manage finances' : 'Sign in';

  return (
    <div className="landing-root min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <header className="landing-nav absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a className="flex items-center gap-2.5" href="#top">
            <BrandLogo size={36} />
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">{APP_NAME}</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-teal-50/90 md:flex">
            <a className="transition hover:text-white" href="#concept">
              Concept
            </a>
            <a className="transition hover:text-white" href="#workflow">
              Workflow
            </a>
            <a className="transition hover:text-white" href="#about">
              About
            </a>
            <a className="transition hover:text-white" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="rounded-xl px-3 py-2 text-sm font-semibold text-teal-50/95 transition hover:bg-white/10 sm:px-4"
              to={secondaryHref}
            >
              {secondaryLabel}
            </Link>
            <Link
              className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-teal-800 shadow-sm transition hover:bg-teal-50 sm:px-4"
              to={primaryHref}
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero relative isolate min-h-dvh overflow-hidden" id="top">
        <div className="landing-hero-plane absolute inset-0" />
        <div className="landing-hero-grain absolute inset-0 opacity-[0.35]" />
        <div className="relative z-10 mx-auto grid min-h-dvh max-w-6xl items-end gap-8 px-5 pb-12 pt-28 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-20 lg:pt-24">
          <div className="landing-hero-copy max-w-xl text-white">
            <p className="font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              {APP_NAME}
            </p>
            <h1 className="mt-5 text-2xl font-semibold leading-snug text-teal-50 sm:text-3xl lg:text-[2rem] lg:leading-snug">
              {APP_TAGLINE}
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-teal-100/90 sm:text-[17px]">
              Offline-first personal finance for Filipino money habits — pesos, budgets, and kinsena loans on your
              phone, synced to the web when you are ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                className="landing-cta-primary inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-[15px] font-bold text-teal-900 transition hover:bg-teal-50"
                to={primaryHref}
              >
                {primaryLabel}
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/5 px-6 py-3.5 text-[15px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                to={secondaryHref}
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
          <div className="landing-hero-visual relative mx-auto w-full max-w-lg lg:max-w-none">
            <HeroLedgerArt />
          </div>
        </div>
      </section>

      <section className="landing-section border-b border-[var(--border)]" id="concept">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Concept</p>
          <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {APP_CONCEPT_TITLE}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">{APP_CONCEPT}</p>
        </div>
      </section>

      <section className="landing-section landing-workflow" id="workflow">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Workflow</p>
          <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            From pocket ledger to cloud clarity
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
            Four steps that keep money visible whether you are offline or reviewing on the web.
          </p>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {APP_WORKFLOW.map((step, index) => (
              <li className="landing-step relative" key={step.title}>
                <span className="font-[family-name:var(--font-display)] text-5xl font-extrabold text-primary/25">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[var(--muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-section border-y border-[var(--border)] bg-[var(--surface)]" id="about">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">About</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
              Pera + kita
            </h2>
            <p className="mt-6 text-base leading-8 text-[var(--muted)] sm:text-lg">{APP_ABOUT}</p>
            <p className="mt-8 text-sm font-medium text-[var(--muted)]">{APP_CREDIT}</p>
          </div>
          <ul className="space-y-0 divide-y divide-[var(--border)]">
            {APP_ABOUT_POINTS.map((point) => (
              <li className="flex gap-4 py-5 first:pt-0 last:pb-0" key={point}>
                <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-primary" />
                <span className="text-[15px] leading-7 text-[var(--foreground)] sm:text-base">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-section" id="faq">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Straight answers about offline use, sync, and what PeraKita tracks.
          </p>
          <div className="mt-10">
            {APP_FAQ.map((item) => (
              <FaqItem answer={item.a} key={item.q} question={item.q} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-footer-cta relative overflow-hidden">
        <div className="landing-hero-plane absolute inset-0 opacity-95" />
        <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 text-center text-white sm:px-8 sm:py-24">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start knowing where your money goes
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-teal-100/90">
            Create an account for the web dashboard, or sign in if you already sync from the mobile app.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="inline-flex rounded-xl bg-white px-6 py-3.5 text-[15px] font-bold text-teal-900 transition hover:bg-teal-50"
              to={primaryHref}
            >
              {primaryLabel}
            </Link>
            <a
              className="inline-flex rounded-xl border border-white/35 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10"
              href="#concept"
            >
              Read the concept
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} />
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <p className="text-sm text-[var(--muted)]">{APP_CREDIT}</p>
        </div>
      </footer>
    </div>
  );
}
