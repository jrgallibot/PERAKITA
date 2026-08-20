export const APP_NAME = 'PeraKita';
export const APP_TAGLINE = 'Know where your money goes — even offline.';
export const APP_DEVELOPER = 'Russel Gallibot';

export const APP_ABOUT =
  'PeraKita (pera + kita) is an offline-first personal finance companion built for everyday Filipino money habits. Track income and expenses in Philippine pesos, manage loans with kinsena schedules, set budgets, and keep a clear Current Balance on your phone — even without signal. When you are online, Sync Now pushes your data to the cloud so the same account stays in sync on the web dashboard.';

export const APP_ABOUT_POINTS = [
  'Offline-first ledger on your device with optional cloud sync',
  'Income, expenses, budgets, and loan tracking in PHP',
  'Kinsena-aware loan payments (15th and month-end)',
  'Same account on mobile and the web dashboard',
] as const;

export const APP_CREDIT = `Created and developed by ${APP_DEVELOPER}`;

/** Android APK hosted on the web app (apps/web/public/downloads). */
export const APP_ANDROID_APK_PATH = '/downloads/perakita.apk';
export const APP_ANDROID_APK_FILENAME = 'PeraKita.apk';
export const APP_ANDROID_APK_LABEL = 'Android APK · Latest build';
export const APP_ANDROID_APK_BLURB =
  'Install on Android for offline-first pesos, budgets, and kinsena loans. Sign in with the same account to sync with the web dashboard.';

/** Landing / marketing copy */
export const APP_CONCEPT_TITLE = 'Built for how money actually moves';
export const APP_CONCEPT =
  'PeraKita treats your phone as the source of truth. Every peso you earn, spend, lend, or repay is written to a local ledger first — so you stay in control on a jeepney ride, at a sari-sari, or anywhere signal drops. The cloud is optional sync, not a gatekeeper.';

export const APP_WORKFLOW = [
  {
    title: 'Capture on device',
    body: 'Log income, expenses, budgets, and loans in PHP. Data lives in SQLite on your phone so the app keeps working offline.',
  },
  {
    title: 'See your balance clearly',
    body: 'Current Balance, budgets, and kinsena-aware loan due dates stay visible so you know what is left and what is due.',
  },
  {
    title: 'Sync when you are ready',
    body: 'With internet, Sync Now pushes your ledger to the cloud. The same account powers the web dashboard for a bigger-screen view.',
  },
  {
    title: 'Review and adjust',
    body: 'Spot spending patterns, update loan payments, tighten budgets, and keep mobile and web aligned on one account.',
  },
] as const;

export const APP_FAQ = [
  {
    q: 'What does PeraKita mean?',
    a: 'Pera + kita — money and “us.” It is personal finance built for everyday Filipino money habits, not generic bank dashboards.',
  },
  {
    q: 'Does it work without internet?',
    a: 'Yes. The mobile app is offline-first. You can record transactions and check balances without signal. Sync is available when you are online.',
  },
  {
    q: 'What can I track?',
    a: 'Income, expenses, budgets, and loans in Philippine pesos — including kinsena-style payment schedules (around the 15th and month-end).',
  },
  {
    q: 'How do mobile and web stay in sync?',
    a: 'Sign in with the same account. On mobile, use Sync Now when online. The web dashboard reads the shared cloud data for the same profile.',
  },
  {
    q: 'Is my data private?',
    a: 'Your ledger starts on your device. Cloud sync uses your authenticated account so only you can access your synced finance data.',
  },
  {
    q: 'How do I install the Android app?',
    a: 'On the homepage, tap Download APK. Open the file when it finishes. Android may ask you to allow installs from your browser — turn that on, then install. Sign in with the same email you use on the web.',
  },
  {
    q: 'Who built PeraKita?',
    a: `Created and developed by ${APP_DEVELOPER}.`,
  },
] as const;