import { NextResponse } from 'next/server';
import { getPublicVendorProfile } from '../../../../server/public-vendors';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const request = _request as import('next/server').NextRequest;
    const session = getSession(request);
    if (session?.role !== 'buyer') return NextResponse.json({ error: 'Google sign-in required.' }, { status: 401 });
    const account = await (await getDb()).collection('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } }, { projection: { _id: 1 } });
    if (!account) return NextResponse.json({ error: 'Google sign-in required.' }, { status: 401 });
    const { slug } = await context.params;
    const profile = await getPublicVendorProfile(slug);
    if (!profile) return NextResponse.json({ error: 'Dealer profile not found.' }, { status: 404 });
    return NextResponse.json({ ...profile, vendor: { ...profile.vendor, phone: undefined } });
  } catch { return NextResponse.json({ error: 'Dealer profile is temporarily unavailable.' }, { status: 503 }); }
}
