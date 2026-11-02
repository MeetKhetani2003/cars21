import { createHmac, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  consent: z.literal(true),
  returnTo: z.string().max(500).optional(),
  phone: z.string().trim().min(10, 'A 10-digit mobile number is mandatory to sign in.').regex(/^(\+91[\-\s]?)?[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number.')
});
const stateCookie = 'cars21_google_oauth';

function safeReturnTo(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

export async function POST(request: NextRequest) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    const errorMsg = body.error.issues[0]?.message || 'A valid 10-digit mobile number and activity-history notice consent are mandatory.';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const signingSecret = process.env.CARS21_SESSION_SECRET;
  if (!clientId || !secret || !signingSecret) {
    return NextResponse.json({ error: 'Google sign-in is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and CARS21_SESSION_SECRET to the server environment.' }, { status: 503 });
  }

  const cleanDigits = body.data.phone.replace(/\D/g, '').slice(-10);
  const normalizedPhone = `+91 ${cleanDigits}`;

  const state = randomBytes(32).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    state,
    returnTo: safeReturnTo(body.data.returnTo),
    phone: normalizedPhone,
    issuedAt: Date.now(),
    consent: true
  })).toString('base64url');
  const signature = createHmac('sha256', signingSecret).update(payload).digest('base64url');
  const response = NextResponse.json({ url: (() => {
    const callbackBase = process.env.CARS21_APP_URL || request.nextUrl.origin;
    const redirectUri = new URL('/api/auth/google/callback', callbackBase).toString();
    const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorization.searchParams.set('client_id', clientId);
    authorization.searchParams.set('redirect_uri', redirectUri);
    authorization.searchParams.set('response_type', 'code');
    authorization.searchParams.set('scope', 'openid email profile');
    authorization.searchParams.set('state', state);
    authorization.searchParams.set('prompt', 'select_account');
    return authorization.toString();
  })() });
  response.cookies.set(stateCookie, `${payload}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google/callback', maxAge: 600 });
  return response;
}
