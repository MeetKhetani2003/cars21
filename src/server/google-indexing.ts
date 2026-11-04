import 'server-only';
import { createSign } from 'node:crypto';
import { getDb } from './mongodb';
import { getSiteOrigin } from './site-origin';

export type IndexingType = 'URL_UPDATED' | 'URL_DELETED';

export type IndexingLog = {
  id?: string;
  url: string;
  type: IndexingType;
  status: 'success' | 'failed' | 'pending_credentials';
  httpStatus?: number;
  response?: any;
  error?: string;
  requestedBy?: string;
  createdAt: Date;
};

// Cached token to avoid requesting new token on every single call
let cachedToken: { token: string; expiresAt: number } | null = null;

function getServiceAccountCredentials() {
  const jsonKey = process.env.GOOGLE_INDEXING_KEY_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (jsonKey) {
    try {
      const parsed = JSON.parse(jsonKey);
      return {
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch {}
  }

  const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (privateKey) {
    // Handle escaped newlines (\n) commonly found in .env files
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return { clientEmail, privateKey };
}

export function isIndexingConfigured(): boolean {
  const { clientEmail, privateKey } = getServiceAccountCredentials();
  return Boolean(clientEmail && privateKey);
}

export async function getIndexingConfigStatus() {
  const { clientEmail, privateKey } = getServiceAccountCredentials();
  const siteUrl = await getSiteOrigin();
  return {
    configured: Boolean(clientEmail && privateKey),
    clientEmail: clientEmail || null,
    siteUrl: siteUrl || 'https://cars21.in',
    hasPrivateKey: Boolean(privateKey),
  };
}

async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const { clientEmail, privateKey } = getServiceAccountCredentials();
  if (!clientEmail || !privateKey) {
    throw new Error('Google Indexing API credentials not found. Provide GOOGLE_INDEXING_CLIENT_EMAIL and GOOGLE_INDEXING_PRIVATE_KEY.');
  }

  // 1. Construct JWT Header & Claim
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimB64 = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const unsignedToken = `${headerB64}.${claimB64}`;

  // 2. Sign with RSA-SHA256
  const sign = createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = `${unsignedToken}.${signature}`;

  // 3. Exchange JWT with Google OAuth2 Token endpoint
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to obtain Google OAuth2 access token');
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return data.access_token;
}

/**
 * Requests Google Indexing API to immediately crawl/index the provided URL(s)
 * Used when a new car dealer is added or updated.
 */
export async function requestGoogleIndexing(
  urlOrUrls: string | string[],
  type: IndexingType = 'URL_UPDATED',
  requestedBy: string = 'system_auto'
): Promise<{ success: boolean; results: any[]; pendingCredentials?: boolean }> {
  const urls = (Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls]).filter(Boolean);
  if (!urls.length) return { success: true, results: [] };

  const db = await getDb();
  const configured = isIndexingConfigured();

  // If credentials are not yet configured, log the pending request so admin knows
  if (!configured) {
    const logs: IndexingLog[] = urls.map(url => ({
      url,
      type,
      status: 'pending_credentials',
      error: 'Google Indexing API service account credentials pending in .env.local',
      requestedBy,
      createdAt: new Date(),
    }));

    await db.collection('indexing_logs').insertMany(logs);
    return {
      success: false,
      pendingCredentials: true,
      results: logs,
    };
  }

  const results: any[] = [];

  try {
    const accessToken = await getGoogleAccessToken();

    for (const url of urls) {
      try {
        const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            url,
            type,
          }),
        });

        const resData = await response.json().catch(() => ({}));

        const log: IndexingLog = {
          url,
          type,
          status: response.ok ? 'success' : 'failed',
          httpStatus: response.status,
          response: resData,
          error: response.ok ? undefined : (resData.error?.message || 'Google API returned error status'),
          requestedBy,
          createdAt: new Date(),
        };

        await db.collection('indexing_logs').insertOne(log);
        results.push(log);
      } catch (err: any) {
        const log: IndexingLog = {
          url,
          type,
          status: 'failed',
          error: err.message || 'Network error communicating with Google Indexing API',
          requestedBy,
          createdAt: new Date(),
        };
        await db.collection('indexing_logs').insertOne(log);
        results.push(log);
      }
    }

    return {
      success: results.every(r => r.status === 'success'),
      results,
    };
  } catch (err: any) {
    console.error('Google Indexing API error:', err);
    return {
      success: false,
      results: [{ error: err.message || 'Google Auth Error' }],
    };
  }
}

/**
 * Retrieve recent indexing logs for the admin dashboard
 */
export async function getRecentIndexingLogs(limit = 50): Promise<IndexingLog[]> {
  try {
    const db = await getDb();
    const docs = await db.collection('indexing_logs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map(d => ({
      id: String(d._id),
      url: String(d.url),
      type: (d.type as IndexingType) || 'URL_UPDATED',
      status: (d.status as IndexingLog['status']) || 'pending_credentials',
      httpStatus: d.httpStatus ? Number(d.httpStatus) : undefined,
      response: d.response,
      error: d.error ? String(d.error) : undefined,
      requestedBy: d.requestedBy ? String(d.requestedBy) : 'system',
      createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
    }));
  } catch {
    return [];
  }
}

