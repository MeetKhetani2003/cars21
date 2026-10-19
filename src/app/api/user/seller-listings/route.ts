import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listingSchema = z.object({
  make: z.string().trim().min(2).max(60), model: z.string().trim().min(1).max(80), variant: z.string().trim().max(120).default(''),
  year: z.coerce.number().int().min(1980).max(2100), km: z.coerce.number().int().min(0).max(2_000_000), fuel: z.string().trim().min(2).max(30),
  transmission: z.string().trim().min(2).max(30), owners: z.coerce.number().int().min(1).max(10), price: z.coerce.number().int().min(1).max(1_000_000_000),
  city: z.string().trim().min(2).max(60), area: z.string().trim().max(80).default(''), body: z.string().trim().min(2).max(40), color: z.string().trim().max(40).default(''),
  phone: z.union([z.string().trim().regex(/^\+?[\d\s()-]{10,24}$/), z.literal('')]).optional().default(''), description: z.string().trim().max(1200).default(''),
});

async function getApprovedSeller(userId: string) {
  const db = await getDb();
  const buyer = await db.collection<Record<string, unknown>>('buyers').findOne({ id: userId, trackingConsentAt: { $exists: true } });
  if (!buyer) return { db, buyer: null, approved: false };
  const approvedLead = await db.collection('sellerLeads').findOne({ userId, verificationStatus: 'approved' }, { projection: { _id: 1 } });
  return { db, buyer, approved: buyer.sellerStatus === 'approved' || Boolean(approvedLead) };
}

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return NextResponse.json({ error: 'Sign in to view your seller workspace.' }, { status: 401 });
  try {
    const { db, buyer, approved } = await getApprovedSeller(session.sub);
    if (!buyer) return NextResponse.json({ error: 'Sign in to view your seller workspace.' }, { status: 401 });
    const leads = await db.collection<Record<string, unknown>>('sellerLeads').find({ userId: session.sub }).sort({ createdAt: -1 }).limit(20).toArray();
    const latest = leads[0];
    if (!approved) return NextResponse.json({ approved: false, applicationStatus: String(latest?.verificationStatus ?? (latest ? 'pending' : 'none')), listings: [] });
    const cars = await db.collection<Record<string, unknown>>('cars').find({ sellerUserId: session.sub }).sort({ updatedAt: -1, createdAt: -1 }).limit(100).toArray();
    const carIds = cars.map(car => String(car.id ?? car._id));
    const inquiries = carIds.length ? await db.collection<Record<string, unknown>>('inquiries').find({ carId: { $in: carIds } }).sort({ createdAt: -1 }).limit(300).toArray() : [];
    const byCar = new Map<string, Record<string, unknown>[]>();
    for (const inquiry of inquiries) {
      const key = String(inquiry.carId ?? '');
      byCar.set(key, [...(byCar.get(key) ?? []), { id: String(inquiry._id), createdAt: inquiry.createdAt, status: inquiry.status, client: inquiry.client }]);
    }
    return NextResponse.json({ approved: true, applicationStatus: 'approved', listings: cars.map(car => ({ ...car, id: String(car.id ?? car._id), _id: undefined, image: car.imageId ? `/api/photos/${encodeURIComponent(String(car.imageId))}` : car.image, inquiries: byCar.get(String(car.id ?? car._id)) ?? [] })) });
  } catch { return NextResponse.json({ error: 'Your seller workspace is temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return NextResponse.json({ error: 'Sign in to submit a car listing.' }, { status: 401 });
  const parsed = listingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the car details and try again.', details: parsed.error.flatten() }, { status: 400 });
  try {
    const { db, buyer, approved } = await getApprovedSeller(session.sub);
    if (!buyer) return NextResponse.json({ error: 'Sign in to submit a car listing.' }, { status: 401 });
    if (!approved) return NextResponse.json({ error: 'Your seller request must be approved before you can list a car.' }, { status: 403 });
    const id = `private-${randomBytes(10).toString('hex')}`;
    const document = {
      id, ...parsed.data, sellerName: String(buyer.name || session.name), sellerPhone: parsed.data.phone || String(buyer.phone || ''),
      sellerUserId: session.sub, badge: 'Private seller', score: 0, accent: 'photo-one', status: 'pending', createdAt: new Date(), updatedAt: new Date(),
    };
    await db.collection('cars').insertOne(document);
    return NextResponse.json({ id, status: 'pending', created: true }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Your listing could not be submitted right now.' }, { status: 503 }); }
}
