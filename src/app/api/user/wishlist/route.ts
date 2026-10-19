import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { getSession } from '../../../../server/auth';
import { ensureDevelopmentDemoInventory } from '../../../../server/demo-inventory';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const updateSchema = z.object({ carId: z.string().min(2).max(80), saved: z.boolean() });

async function getBuyer(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return null;
  const db = await getDb();
  const buyer = await db.collection('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } }, { projection: { id: 1, name: 1, email: 1 } });
  return buyer ? { db, session, buyer } : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getBuyer(request);
    if (!auth) return NextResponse.json({ error: 'Sign in with Google to view your saved cars.' }, { status: 401 });
    await ensureDevelopmentDemoInventory();
    const saved = await auth.db.collection<Record<string, unknown>>('buyer_wishlists').find({ userId: auth.session.sub }).sort({ updatedAt: -1 }).toArray();
    const ids = saved.map(item => String(item.carId));
    const documents = ids.length ? await auth.db.collection<Record<string, unknown>>('cars').find({ id: { $in: ids }, $or: [{ status: 'active' }, { status: { $exists: false } }] }).toArray() : [];
    const vendorIds = [...new Set(documents.map(car => String(car.vendorId ?? '')).filter(Boolean))];
    const vendors = vendorIds.length ? await auth.db.collection<Record<string, unknown>>('vendors').find({ id: { $in: vendorIds }, status: 'active' }).project({ id: 1, name: 1, businessName: 1 }).toArray() : [];
    const vendorById = new Map(vendors.map(vendor => [String(vendor.id), vendor]));
    const carById = new Map(documents.map(car => {
      const id = String(car.id ?? car._id); const imageId = String(car.imageId ?? ''); const vendorId = String(car.vendorId ?? ''); const vendor = vendorById.get(vendorId); const vendorName = String(vendor?.businessName || vendor?.name || '');
      return [id, { id, make: String(car.make ?? ''), model: String(car.model ?? ''), variant: String(car.variant ?? ''), year: Number(car.year ?? 0), km: Number(car.km ?? 0), fuel: String(car.fuel ?? ''), transmission: String(car.transmission ?? ''), owners: Number(car.owners ?? 1), price: Number(car.price ?? 0), city: String(car.city ?? ''), body: String(car.body ?? ''), score: Number(car.score ?? 0), badge: String(car.badge ?? 'Cars21 listing'), image: imageId ? `/api/photos/${encodeURIComponent(imageId)}` : String(car.image ?? '/images/kars21-hero.png'), accent: String(car.accent ?? 'photo-one'), color: String(car.color ?? ''), vendorId, ...(vendor ? { vendorName, vendorSlug: vendorSlug(vendorName, vendorId) } : {}) }];
    }));
    return NextResponse.json({ ids: ids.filter(id => carById.has(id)), cars: ids.map(id => carById.get(id)).filter(Boolean) });
  } catch { return NextResponse.json({ error: 'Saved cars are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid car to save.' }, { status: 400 });
  try {
    const auth = await getBuyer(request);
    if (!auth) return NextResponse.json({ error: 'Sign in with Google to save cars.' }, { status: 401 });
    await ensureDevelopmentDemoInventory();
    const car = await auth.db.collection<Record<string, unknown>>('cars').findOne({ id: parsed.data.carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
    if (!car) return NextResponse.json({ error: 'This car is no longer available.' }, { status: 404 });
    const wishlists = auth.db.collection('buyer_wishlists');
    await wishlists.createIndex({ userId: 1, carId: 1 }, { unique: true });
    const now = new Date(); const carId = String(car.id); const vendorId = String(car.vendorId ?? '');
    if (parsed.data.saved) {
      await wishlists.updateOne({ userId: auth.session.sub, carId }, { $setOnInsert: { userId: auth.session.sub, carId, createdAt: now }, $set: { updatedAt: now, vendorId } }, { upsert: true });
      const label = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim();
      await auth.db.collection('user_actions').insertOne({ userId: auth.session.sub, clientName: String(auth.buyer.name || auth.session.name), clientEmail: String(auth.buyer.email || auth.session.email || ''), action: 'wishlist_add', targetType: 'car', targetLabel: label, carId, carLabel: label, vendorId, createdAt: now }).catch(() => null);
    } else {
      await wishlists.deleteOne({ userId: auth.session.sub, carId });
      await auth.db.collection('user_actions').insertOne({ userId: auth.session.sub, clientName: String(auth.buyer.name || auth.session.name), clientEmail: String(auth.buyer.email || auth.session.email || ''), action: 'wishlist_remove', targetType: 'car', targetLabel: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim(), carId, vendorId, createdAt: now }).catch(() => null);
    }
    return NextResponse.json({ saved: parsed.data.saved, carId });
  } catch { return NextResponse.json({ error: 'Wishlist could not be updated.' }, { status: 503 }); }
}
