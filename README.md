# PeraKita

Offline-first personal finance assistant for mobile, with a Next.js web dashboard.

**Tagline:** Know where your money goes before it runs out.

## Stack

- **Mobile:** Expo SDK 54, Expo Router, SQLite (offline-first), Supabase sync
- **Web:** Next.js static SPA (React Router), Tailwind CSS, Supabase Auth
- **Shared:** PESO engine (safe-to-spend, forecast, health score), Zod validation, theme tokens
- **Cloud:** Supabase (PostgreSQL + RLS + Edge Functions for reports)

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local cloud dev)
- Expo Go app or Android/iOS simulator

## Setup

```bash
pnpm install
cp .env.example .env
# Fill in Supabase URL and anon key in the repo-root .env
```

Keep one `.env` at the **repo root**. Next.js and Expo load it from there — they do not read a file inside `apps/web` or `apps/mobile`. Restart `pnpm dev:web` and `pnpm dev:mobile` after any change.

### Environment variables

| Variable | Used by |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile |
| `EXPO_PUBLIC_WEB_APP_URL` | Mobile (web dashboard link; default `https://perakita-web.vercel.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Web |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web |

Never commit the service role key to the mobile app.

### PESO engine & AI

- **Safe-to-spend**, forecast, health score, and spending-risk logic live in `packages/shared/src/peso/`.
- Mobile aggregates data offline via `apps/mobile/src/services/pesoEngineService.ts`.
- Web reads Supabase via `apps/web/lib/peso.ts`.
- AI insights and chat use **PeraKita Local AI** in `packages/shared/src/peso/localAi.ts` — rule-based answers from your PESO snapshot (no Gemini or third-party LLM). Runs on-device in mobile/web; optional Edge Functions `peso-ai-insight` / `peso-ai-chat` expose the same logic over HTTP.
- **Demo data:** Mobile Settings → **Load demo data** (₱25k hackathon scenario).
- **Notifications:** Settings → **App notifications** (web dashboard banners + mobile push). Master ON/OFF plus toggles for bills, loans, budget warnings, and daily safe-to-spend. Defaults to OFF until you enable and save.

### Supabase

```bash
# Local Supabase (optional)
supabase start
supabase db reset   # applies migrations + seed
```

Apply migrations to a cloud project via Supabase Dashboard or `supabase db push`.

### Auth emails (PeraKita branded)

HTML templates live in `supabase/templates/`. They match the app: teal `#0D9488`, ₱ mark, and card layout.

**Hosted project (the emails in Gmail):** open [Email Templates](https://supabase.com/dashboard/project/ogfzkilwzkoewvshqkdq/auth/templates) and paste each file:

| Dashboard template | File |
|--------------------|------|
| Confirm signup | `confirmation.html` |
| Invite user | `invite.html` |
| Magic Link | `magic_link.html` |
| Change Email Address | `email_change.html` |
| Reset Password | `recovery.html` |
| Reauthentication | `reauthentication.html` |

Also paste the security emails (`password_changed.html`, `email_changed.html`, and the rest) on the same page. After saving, register again to receive the new design.

The From line stays `Supabase Auth <noreply@mail.app.supabase.io>` until you add custom SMTP. The body and subject will say PeraKita.

To push all templates via API after `npx supabase login`:

```bash
set SUPABASE_ACCESS_TOKEN=your-token
node scripts/push-email-templates.cjs
```

Create a token at [Account tokens](https://supabase.com/dashboard/account/tokens).

### Finance report emails (auto notify)

Reports are sent by the Edge Function `send-finance-report` to the user’s **auth account email** (the same address in Settings). Enable auto-send and frequency under **Settings → Report email notifications**.

Supabase Auth templates only cover signup/reset. Custom report mail uses Resend (Supabase’s documented approach):

1. Create an API key at [resend.com](https://resend.com/api-keys)
2. In Supabase → **Project Settings → Edge Functions → Secrets**, add:
   - `RESEND_API_KEY` = your Resend key
   - optional `REPORT_FROM_EMAIL` = `PeraKita <you@your-verified-domain.com>` (defaults to Resend’s onboarding sender for tests)

Until that secret is set, “Email me now” will explain that `RESEND_API_KEY` is missing.

## Development

```bash
pnpm dev:mobile   # Expo dev server
pnpm dev:web      # Web SPA on http://localhost:3000
pnpm typecheck    # TypeScript across workspace
pnpm build:apk    # Release APK (Android Studio SDK + repo root .env)
```

### Linked wallets (GCash / Maya / bank)

PeraKita does **not** connect live to GCash, Maya, or bank APIs. You link each wallet in the app, open the real app to check your balance, then enter it in PeraKita to sync:

- **Mobile:** Home → Wallet balances, or Settings → Linked wallets & banks
- **Web:** Dashboard wallet cards, Settings → Linked wallets, or Manage finances → Linked wallets & banks

Balance updates create a reconciliation adjustment when the amount differs from what PeraKita already had.

### Build APK locally

1. Install [Android Studio](https://developer.android.com/studio) (JDK + Android SDK).
2. Put `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the repo root `.env`.
3. From the repo root:

```bash
pnpm build:apk
```

Or from `apps/mobile`: `pnpm build:apk`. Use `pnpm --filter @perakita/mobile build:apk -- -Clean` to regenerate the native `android/` folder after config changes.

On Windows, local Gradle builds need [long paths enabled](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation) because React Native codegen paths can exceed 260 characters. If local Gradle still fails, use the cloud builder instead:

```bash
pnpm build:apk:eas
```

Output (local): `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (also copied to `apps/mobile/assets/perakita.apk` and `apps/web/public/downloads/perakita.apk`).

## Architecture

```
UI → Hooks → Services → Repositories → SQLite (primary)
                              ↓
                         Sync Queue → Supabase (when online)
```

- All financial reads/writes go through SQLite repositories
- UUIDs generated client-side for offline-safe creates
- Soft deletes + sync metadata on all user entities

## Phase 1 (current)

- Monorepo scaffold
- Polished login/signup (mobile + web)
- Light / dark / system theme
- SQLite schema + repositories
- Supabase schema + RLS
- Home dashboard skeleton with PHP formatting

## License

Private — PeraKita
