import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ carId: z.string().min(2).max(80).optional(), vendorSlug: z.string().min(2).max(180).optional() }).refine(value => value.carId || value.vendorSlug);

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return NextResponse.json({ error: 'Sign in with Google to view dealer contact details.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid car or dealer.' }, { status: 400 });
  try {
    const db = await getDb();
    const buyer = await db.collection<Record<string, unknown>>('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } }, { projection: { id: 1, name: 1, email: 1 } });
    if (!buyer) return NextResponse.json({ error: 'Sign in with Google to view dealer contact details.' }, { status: 401 });
    let car: Record<string, unknown> | null = null;
    let vendor: Record<string, unknown> | null = null;
    if (parsed.data.carId) {
      car = await db.collection<Record<string, unknown>>('cars').findOne({ id: parsed.data.carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
      if (!car) return NextResponse.json({ error: 'This car is no longer available.' }, { status: 404 });
      const vendorId = String(car.vendorId ?? '');
      if (vendorId) vendor = await db.collection<Record<string, unknown>>('vendors').findOne({ id: vendorId, status: 'active' }, { projection: { id: 1, name: 1, businessName: 1, phone: 1, inquiryWhatsApp: 1 } });
    } else if (parsed.data.vendorSlug) {
      const vendors = db.collection<Record<string, unknown>>('vendors');
      vendor = await vendors.findOne({ status: 'active', slug: parsed.data.vendorSlug }, { projection: { id: 1, name: 1, businessName: 1, phone: 1, inquiryWhatsApp: 1 } })
        ?? (await vendors.find({ status: 'active' }).project({ id: 1, name: 1, businessName: 1, phone: 1, inquiryWhatsApp: 1 }).limit(2000).toArray()).find(item => vendorSlug(String(item.businessName ?? item.name ?? ''), String(item.id ?? item._id)) === parsed.data.vendorSlug) ?? null;
      if (!vendor) return NextResponse.json({ error: 'Dealer profile not found.' }, { status: 404 });
    }
    const phone = String(vendor?.inquiryWhatsApp || vendor?.phone || car?.sellerWhatsApp || car?.sellerPhone || '');
    if (!phone) return NextResponse.json({ error: 'This seller has not provided a phone number.' }, { status: 404 });
    const vendorId = String(vendor?.id ?? vendor?._id ?? car?.vendorId ?? '');
    const vendorName = vendor ? String(vendor.businessName || vendor.name || 'Dealer') : '';
    const carId = String(car?.id ?? '');
    const carLabel = car ? `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() : '';
    const collection = db.collection('user_actions');
    await Promise.all([collection.createIndex({ userId: 1, createdAt: -1 }), collection.createIndex({ carId: 1, createdAt: -1 }), collection.createIndex({ vendorId: 1, createdAt: -1 })]);
    await collection.insertOne({ userId: session.sub, clientName: String(buyer.name || session.name), clientEmail: String(buyer.email || session.email || ''), action: 'reveal_phone', targetType: carId ? 'car' : 'vendor', targetLabel: carLabel || vendorName, carId, carLabel, vendorId, vendorName, createdAt: new Date() });
    return NextResponse.json({ phone, vendorName, carLabel });
  } catch { return NextResponse.json({ error: 'Dealer contact details are temporarily unavailable.' }, { status: 503 }); }
}
