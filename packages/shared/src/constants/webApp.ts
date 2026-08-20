/** Production web app (Vercel). Override in dev with EXPO_PUBLIC_WEB_APP_URL. */
export const WEB_APP_URL = 'https://perakita-web.vercel.app';

export function normalizeWebAppUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function webAppPath(baseUrl: string, path = '/'): string {
  const base = normalizeWebAppUrl(baseUrl);
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}${segment}`;
}
