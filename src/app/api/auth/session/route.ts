import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, getSession, sessionCookieMaxAge, sessionCookieName, verifyPassword, verifySuperadminCredentials } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({ role: z.enum(['superadmin', 'admin', 'vendor']), identifier: z.string().trim().min(1).max(160).optional(), email: z.union([z.string().trim().email().max(160), z.literal('')]).optional(), password: z.string().min(1).max(200) });

export async function GET(request: NextRequest) {
  try {
    if (!request.cookies.get(sessionCookieName)?.value) return NextResponse.json({ user: null });
    const user = getSession(request);
    if (!user) return NextResponse.json({ user: null });
    if (user.role === 'vendor' || user.role === 'admin') {
      const collectionName = user.role === 'vendor' ? 'vendors' : 'admins';
      const account = await (await getDb()).collection(collectionName).findOne({ id: user.sub, status: 'active' }, { projection: { _id: 1 } });
      if (!account) return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: { role: user.role, name: user.name || 'Cars21 User', email: user.email } });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter your management credentials.' }, { status: 400 });
  const { role, password } = parsed.data;
  let user: { sub: string; role: 'superadmin' | 'admin' | 'vendor'; name: string; email?: string; vendorId?: string } | null = null;
  if (role === 'superadmin') {
    const identifier = parsed.data.identifier || parsed.data.email || '';
    if (!process.env.CARS21_SUPERADMIN_USERNAME || !process.env.CARS21_SUPERADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Superadmin sign-in is not configured. Set CARS21_SUPERADMIN_USERNAME and CARS21_SUPERADMIN_PASSWORD.' }, { status: 503 });
    }
    if (verifySuperadminCredentials(identifier, password)) user = { sub: 'cars21-superadmin', role, name: 'Cars21 Superadmin', email: identifier };
  } else {
    try {
      const email = (parsed.data.email || parsed.data.identifier || '').toLowerCase();
      const collectionName = role === 'vendor' ? 'vendors' : 'admins';
      const account = email ? await (await getDb()).collection<Record<string, unknown>>(collectionName).findOne({ email, status: 'active' }) : null;
      if (account && await verifyPassword(password, String(account.passwordSalt ?? ''), String(account.passwordHash ?? ''))) {
        user = role === 'vendor'
          ? { sub: String(account.id), role, vendorId: String(account.id), name: String(account.businessName || account.name), email: String(account.email) }
          : { sub: String(account.id), role, name: String(account.name || 'Cars21 Admin'), email: String(account.email) };
      }
    } catch { return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 }); }
  }
  if (!user) return NextResponse.json({ error: 'Those credentials could not be verified.' }, { status: 401 });
  let token: string;
  try { token = createSession(user); } catch { return NextResponse.json({ error: 'Management access is not configured. Set CARS21_SESSION_SECRET.' }, { status: 503 }); }
  const response = NextResponse.json({ user: { role: user.role, name: user.name, email: user.email } });
  response.cookies.set(sessionCookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: sessionCookieMaxAge });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
