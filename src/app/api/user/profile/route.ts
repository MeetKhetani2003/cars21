import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const profileSchema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(24).optional().default(''), city: z.string().trim().max(80).optional().default('') });

async function profile(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return null;
  const db = await getDb();
  const buyer = await db.collection<Record<string, unknown>>('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } });
  return buyer ? { db, session, buyer } : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await profile(request);
    if (!auth) return NextResponse.json({ error: 'Sign in with Google to view your profile.' }, { status: 401 });
    return NextResponse.json({ profile: { name: auth.buyer.name, email: auth.buyer.email, picture: auth.buyer.picture, phone: auth.buyer.phone || '', city: auth.buyer.city || '' } });
  } catch { return NextResponse.json({ error: 'Profile is temporarily unavailable.' }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a name and check your profile details.' }, { status: 400 });
  try {
    const auth = await profile(request);
    if (!auth) return NextResponse.json({ error: 'Sign in with Google to update your profile.' }, { status: 401 });
    await auth.db.collection('buyers').updateOne({ id: auth.session.sub }, { $set: { name: parsed.data.name, phone: parsed.data.phone, city: parsed.data.city, updatedAt: new Date() } });
    return NextResponse.json({ profile: { name: parsed.data.name, email: auth.buyer.email, picture: auth.buyer.picture, phone: parsed.data.phone, city: parsed.data.city } });
  } catch { return NextResponse.json({ error: 'Profile could not be saved.' }, { status: 503 }); }
}
