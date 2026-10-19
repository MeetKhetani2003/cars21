import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSession, sessionCookieMaxAge, sessionCookieName } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stateCookie = 'cars21_google_oauth';
type GoogleUser = { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };

function validStateCookie(value: string, expectedState: string, secret: string) {
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { state?: string; returnTo?: string; issuedAt?: number; consent?: boolean };
    if (parsed.state !== expectedState || parsed.consent !== true || !parsed.issuedAt || Date.now() - parsed.issuedAt > 10 * 60 * 1000) return null;
    if (!parsed.returnTo?.startsWith('/') || parsed.returnTo.startsWith('//') || parsed.returnTo.includes('\\')) parsed.returnTo = '/';
    return parsed;
  } catch { return null; }
}

function fail(request: NextRequest, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, request.nextUrl.origin));
  response.cookies.set(stateCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google/callback', maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') || '';
  const state = request.nextUrl.searchParams.get('state') || '';
  const stateValue = request.cookies.get(stateCookie)?.value || '';
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const sessionSecret = process.env.CARS21_SESSION_SECRET || '';
  const parsedState = state && stateValue && sessionSecret ? validStateCookie(stateValue, state, sessionSecret) : null;
  if (!parsedState || !code || !clientId || !clientSecret) return fail(request, 'oauth_failed');

  try {
    const callbackBase = process.env.CARS21_APP_URL || request.nextUrl.origin;
    const redirectUri = new URL('/api/auth/google/callback', callbackBase).toString();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      cache: 'no-store',
    });
    if (!tokenResponse.ok) return fail(request, 'oauth_failed');
    const tokens = await tokenResponse.json() as { access_token?: string; token_type?: string };
    if (!tokens.access_token) return fail(request, 'oauth_failed');
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store' });
    if (!userResponse.ok) return fail(request, 'oauth_failed');
    const profile = await userResponse.json() as GoogleUser;
    if (!profile.sub || !profile.email || profile.email_verified !== true) return fail(request, 'unverified_email');

    const db = await getDb();
    const users = db.collection<Record<string, unknown>>('buyers');
    await Promise.all([users.createIndex({ googleSub: 1 }, { unique: true }), users.createIndex({ email: 1 }, { unique: true })]);
    const existingByEmail = await users.findOne({ email: profile.email.toLowerCase() });
    if (existingByEmail && existingByEmail.googleSub !== profile.sub) return fail(request, 'account_conflict');
    const userId = String(existingByEmail?.id || randomBytes(18).toString('base64url'));
    const now = new Date();
    await users.updateOne({ googleSub: profile.sub }, {
      $set: { id: userId, googleSub: profile.sub, email: profile.email.toLowerCase(), name: profile.name || profile.email.split('@')[0], picture: profile.picture || '', trackingConsentAt: now, updatedAt: now },
      $setOnInsert: { createdAt: now },
    }, { upsert: true });
    const name = profile.name || profile.email.split('@')[0];
    const session = createSession({ sub: userId, role: 'buyer', name, email: profile.email.toLowerCase() });
    const appBase = process.env.CARS21_APP_URL || request.nextUrl.origin;
    const response = NextResponse.redirect(new URL(parsedState.returnTo || '/', appBase));
    response.cookies.set(sessionCookieName, session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: sessionCookieMaxAge });
    response.cookies.set(stateCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google/callback', maxAge: 0 });
    return response;
  } catch { return fail(request, 'oauth_unavailable'); }
}
