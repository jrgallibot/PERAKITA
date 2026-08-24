# PeraKita

Offline-first personal finance & debt tracker for mobile, with a Next.js web dashboard.

## Stack

- **Mobile:** Expo SDK 54 (Expo Go / Play Store compatible), Expo Router, SQLite, Supabase Auth
- **Web:** Next.js static SPA (React Router), Tailwind CSS, Supabase Auth
- **Shared:** TypeScript types, Zod validation, theme tokens, calculations
- **Cloud:** Supabase (PostgreSQL + RLS)

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
```

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
