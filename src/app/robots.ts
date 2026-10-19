import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '../server/site-origin';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteOrigin();
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/superadmin', '/vendor', '/account', '/api/'] },
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
