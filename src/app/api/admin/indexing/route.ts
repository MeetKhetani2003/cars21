import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest, isSuperAdminRequest } from '@/server/auth';
import { 
  getIndexingConfigStatus, 
  getRecentIndexingLogs, 
  requestGoogleIndexing 
} from '@/server/google-indexing';
import { getRankedVendorsForSitemap } from '@/server/public-vendors';
import { getSiteOrigin } from '@/server/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request) && !isSuperAdminRequest(request)) {
    return NextResponse.json({ error: 'Management permission required.' }, { status: 403 });
  }

  const [status, logs, vendors, siteUrl] = await Promise.all([
    getIndexingConfigStatus(),
    getRecentIndexingLogs(40),
    getRankedVendorsForSitemap(),
    getSiteOrigin(),
  ]);

  const dealerUrls = vendors.map(v => ({
    id: v.id,
    businessName: v.businessName,
    slug: v.slug,
    city: v.city,
    listingCount: v.listingCount,
    rankPriority: v.rankPriority,
    url: `${siteUrl}/dealers/${v.slug}`,
    lastModified: v.lastModified,
  }));

  return NextResponse.json({
    status,
    sitemapUrl: `${siteUrl}/sitemap.xml`,
    totalDealers: vendors.length,
    dealers: dealerUrls,
    logs,
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request) && !isSuperAdminRequest(request)) {
    return NextResponse.json({ error: 'Management permission required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action || 'index_urls';
  const siteUrl = await getSiteOrigin();

  if (action === 'index_all_dealers') {
    const vendors = await getRankedVendorsForSitemap();
    const urls = vendors.map(v => `${siteUrl}/dealers/${v.slug}`);
    // Also include city hubs and main dealer directory
    urls.push(`${siteUrl}/dealers`, `${siteUrl}/sitemap.xml`);

    const result = await requestGoogleIndexing(urls, 'URL_UPDATED', 'manual_bulk_dealers');
    return NextResponse.json({
      success: result.success,
      pendingCredentials: result.pendingCredentials,
      submittedCount: urls.length,
      results: result.results,
    });
  }

  if (action === 'index_sitemap') {
    const urls = [`${siteUrl}/sitemap.xml`, `${siteUrl}/dealers`];
    const result = await requestGoogleIndexing(urls, 'URL_UPDATED', 'manual_sitemap');
    return NextResponse.json({
      success: result.success,
      pendingCredentials: result.pendingCredentials,
      submittedCount: urls.length,
      results: result.results,
    });
  }

  // Single URL or custom list
  const urls: string[] = Array.isArray(body.urls) ? body.urls : (body.url ? [body.url] : []);
  if (!urls.length) {
    return NextResponse.json({ error: 'No URLs specified for indexing' }, { status: 400 });
  }

  const result = await requestGoogleIndexing(urls, body.type || 'URL_UPDATED', 'manual_single');
  return NextResponse.json({
    success: result.success,
    pendingCredentials: result.pendingCredentials,
    submittedCount: urls.length,
    results: result.results,
  });
}

