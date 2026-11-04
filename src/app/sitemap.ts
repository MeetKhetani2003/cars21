import type { MetadataRoute } from 'next';
import { getRankedVendorsForSitemap } from '../server/public-vendors';
import { getSiteOrigin } from '../server/site-origin';
import { getDb } from '../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteOrigin();
  if (!siteUrl) return [];

  const now = new Date();

  // Core Static Platform Pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}`, changeFrequency: 'daily', priority: 1.0, lastModified: now },
    { url: `${siteUrl}/buy-cars`, changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { url: `${siteUrl}/dealers`, changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { url: `${siteUrl}/dealer-auctions`, changeFrequency: 'daily', priority: 0.88, lastModified: now },
    { url: `${siteUrl}/sell-car`, changeFrequency: 'weekly', priority: 0.85, lastModified: now },
    { url: `${siteUrl}/sell-car/inquiry`, changeFrequency: 'weekly', priority: 0.85, lastModified: now },
    { url: `${siteUrl}/pricing`, changeFrequency: 'monthly', priority: 0.7, lastModified: now },
    { url: `${siteUrl}/about-us`, changeFrequency: 'monthly', priority: 0.65, lastModified: now },
    { url: `${siteUrl}/contact-us`, changeFrequency: 'monthly', priority: 0.65, lastModified: now },
  ];

  // City Landing Pages (Prioritizing Junagadh, Rajkot, Ahmedabad and Gujarat hubs)
  const priorityCities = [
    'Junagadh',
    'Rajkot',
    'Ahmedabad',
    'Gondal',
    'Jetpur',
    'Morbi',
    'Jamnagar',
    'Bhavnagar',
    'Surat',
    'Vadodara',
  ];

  const cityPages: MetadataRoute.Sitemap = priorityCities.map(city => ({
    url: `${siteUrl}/dealers?city=${encodeURIComponent(city)}`,
    changeFrequency: 'daily',
    priority: city === 'Junagadh' ? 0.9 : 0.85,
    lastModified: now,
  }));

  try {
    const db = await getDb();

    // 1. All Active Car Dealers (Dynamically Ranked from MongoDB)
    // Whenever a new car dealer is added or updated, this list auto-updates immediately!
    const vendors = await getRankedVendorsForSitemap();
    const dealerPages: MetadataRoute.Sitemap = vendors.map(vendor => ({
      url: `${siteUrl}/dealers/${vendor.slug}`,
      lastModified: vendor.lastModified || (vendor.createdAt ? new Date(vendor.createdAt) : now),
      changeFrequency: vendor.listingCount > 0 ? 'daily' : 'weekly',
      priority: vendor.rankPriority,
    }));

    // 2. All Active Car Listings
    const cars = await db.collection('cars')
      .find({ status: 'active' })
      .project({ id: 1, updatedAt: 1, createdAt: 1 })
      .limit(3000)
      .toArray();

    const carPages: MetadataRoute.Sitemap = cars.map(car => ({
      url: `${siteUrl}/car/${encodeURIComponent(String(car.id || car._id))}`,
      lastModified: car.updatedAt ? new Date(car.updatedAt) : (car.createdAt ? new Date(car.createdAt) : now),
      changeFrequency: 'daily',
      priority: 0.78,
    }));

    return [
      ...staticPages,
      ...cityPages,
      ...dealerPages,
      ...carPages,
    ];
  } catch (err) {
    console.error('Sitemap dynamic generation error:', err);
    return [...staticPages, ...cityPages];
  }
}
