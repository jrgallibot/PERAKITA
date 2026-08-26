import { WEB_APP_URL, normalizeWebAppUrl, webAppPath } from '@perakita/shared';
import { EXPO_PUBLIC_WEB_APP_URL } from '@/lib/env';

export function getWebAppUrl(): string {
  return normalizeWebAppUrl(EXPO_PUBLIC_WEB_APP_URL || WEB_APP_URL);
}

export function getWebAppLink(path = '/'): string {
  return webAppPath(getWebAppUrl(), path);
}
