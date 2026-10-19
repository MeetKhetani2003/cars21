import 'server-only';
import { headers } from 'next/headers';

export async function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.CARS21_APP_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
    } catch {}
  }
  const requestHeaders = await headers();
  const host = (requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || '').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return '';
  const forwardedProtocol = (requestHeaders.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https' ? forwardedProtocol : /^(localhost|127\.)/i.test(host) ? 'http' : 'https';
  return `${protocol}://${host}`;
}
