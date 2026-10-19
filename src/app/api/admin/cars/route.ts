import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../server/auth';
import { ensureDevelopmentDemoInventory } from '../../../../server/demo-inventory';
import { vendorSlug as makeVendorSlug } from '../../../../lib/vendor-slug';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    const db = await getDb();
    const collection = db.collection<Record<string, unknown>>('cars');
    await ensureDevelopmentDemoInventory();
    const cars = await collection.find({}).sort({ updatedAt: -1, year: -1 }).limit(300).toArray();
    const vendorIds = [...new Set(cars.map(car => String(car.vendorId ?? '')).filter(Boolean))];
    const vendorDocs = vendorIds.length ? await db.collection<Record<string, unknown>>('vendors').find({ id: { $in: vendorIds } }).project({ id: 1, name: 1, businessName: 1 }).toArray() : [];
    const vendorMap = new Map(vendorDocs.map(vendor => { const id = String(vendor.id ?? ''); const name = String(vendor.businessName ?? vendor.name ?? 'Vendor'); return [id, { name, slug: makeVendorSlug(name, id) }]; }));
    return NextResponse.json({ cars: cars.map(car => { const id = String(car.id ?? car._id); const vendorId = String(car.vendorId ?? ''); const vendor = vendorMap.get(vendorId); return { ...car, id, vendorName: vendor?.name ?? '', vendorSlug: vendor?.slug ?? '', _id: undefined, imageId: undefined, image: car.imageId ? `/api/photos/${encodeURIComponent(String(car.imageId))}` : car.image }; }) });
  } catch { return NextResponse.json({ error: 'Inventory is temporarily unavailable.' }, { status: 503 }); }
}
