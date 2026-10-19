import type { MetadataRoute } from 'next';
import { getPublicVendorDirectory } from '../server/public-vendors';
import { getSiteOrigin } from '../server/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteOrigin();
  if (!siteUrl) return [];
  const staticPages = ['', '/buy-cars', '/dealers', '/sell-car', '/about-us', '/pricing', '/contact-us'].map(path => ({ url: `${siteUrl}${path}`, changeFrequency: 'daily' as const, priority: path === '' ? 1 : .8 }));
  try {
    const vendors = await getPublicVendorDirectory();
    return [...staticPages, ...vendors.map(vendor => ({ url: `${siteUrl}/dealers/${vendor.slug}`, lastModified: vendor.createdAt ? new Date(vendor.createdAt) : undefined, changeFrequency: 'weekly' as const, priority: .65 }))];
  } catch { return staticPages; }
}
