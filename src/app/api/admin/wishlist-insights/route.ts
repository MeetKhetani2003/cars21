import { NextRequest, NextResponse } from 'next/server';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { getSession, isAdminRequest, isVendorSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = getSession(request); const vendorSession = isVendorSession(request);
  if (!isAdminRequest(request) && !vendorSession) return NextResponse.json({ error: 'Workspace access required.' }, { status: 401 });
  try {
    const db = await getDb(); const pipeline: Record<string, unknown>[] = [];
    if (vendorSession) {
      const ownCars = await db.collection<Record<string, unknown>>('cars').find({ vendorId: vendorSession.vendorId, $or: [{ status: 'active' }, { status: { $exists: false } }] }).project({ id: 1 }).toArray();
      const ownIds = ownCars.map(car => String(car.id));
      if (!ownIds.length) return NextResponse.json({ items: [], updatedAt: new Date().toISOString(), scope: 'vendor', role: 'vendor' });
      pipeline.push({ $match: { carId: { $in: ownIds } } });
    }
    pipeline.push({ $group: { _id: '$carId', saves: { $sum: 1 }, uniqueBuyers: { $addToSet: '$userId' }, lastSaved: { $max: '$updatedAt' }, vendorId: { $first: '$vendorId' } } }, { $sort: { saves: -1, lastSaved: -1 } }, { $limit: 500 });
    const groups = await db.collection<Record<string, unknown>>('buyer_wishlists').aggregate(pipeline).toArray();
    const ids = groups.map(group => String(group._id)); const cars = ids.length ? await db.collection<Record<string, unknown>>('cars').find({ id: { $in: ids }, $or: [{ status: 'active' }, { status: { $exists: false } }] }).toArray() : [];
    const vendors = await db.collection<Record<string, unknown>>('vendors').find({}).project({ id: 1, name: 1, businessName: 1 }).toArray();
    const vendorById = new Map(vendors.map(vendor => [String(vendor.id), vendor])); const carById = new Map(cars.map(car => [String(car.id), car]));
    const items = groups.flatMap(group => {
      const car = carById.get(String(group._id)); if (!car) return [];
      const vendorId = String(car.vendorId ?? group.vendorId ?? ''); const vendor = vendorById.get(vendorId); const dealerName = String(vendor?.businessName || vendor?.name || 'Cars21 direct');
      return [{ carId: String(car.id), title: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim(), variant: String(car.variant || ''), city: String(car.city || ''), price: Number(car.price || 0), status: String(car.status || 'active'), image: car.imageId ? `/api/photos/${encodeURIComponent(String(car.imageId))}` : String(car.image || ''), vendorId, vendorName: dealerName, vendorSlug: vendor ? vendorSlug(dealerName, vendorId) : '', saves: Number(group.saves || 0), uniqueBuyers: Array.isArray(group.uniqueBuyers) ? group.uniqueBuyers.length : 0, lastSaved: group.lastSaved || null }];
    });
    return NextResponse.json({ items, updatedAt: new Date().toISOString(), scope: vendorSession ? 'vendor' : 'platform', role: session?.role || 'token' });
  } catch { return NextResponse.json({ error: 'Wishlist demand data is temporarily unavailable.' }, { status: 503 }); }
}
