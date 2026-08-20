import { WEB_APP_URL, normalizeWebAppUrl, webAppPath } from '@perakita/shared';

export function getWebAppUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  return normalizeWebAppUrl(fromEnv || WEB_APP_URL);
}

export function getWebAppLink(path = '/'): string {
  return webAppPath(getWebAppUrl(), path);
}
