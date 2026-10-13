import { NextRequest, NextResponse } from 'next/server';
import { cars as demoCars } from '../../../../data';
import { isAdminRequest, isVendorSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const car = await (await getDb()).collection<Record<string, unknown>>('cars').findOne({ id });
    if (car) {
      if ((car.status && car.status !== 'active') && !isAdminRequest(_request)) return NextResponse.json({ error: 'Car not found.' }, { status: 404 });
      const imageId = car.imageId ? String(car.imageId) : '';
      return NextResponse.json({ car: { ...car, _id: undefined, imageId: undefined, image: imageId ? `/api/photos/${encodeURIComponent(imageId)}` : car.image } });
    }
  } catch {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Inventory is temporarily unavailable.' }, { status: 503 });
  }
  if (process.env.NODE_ENV !== 'production') {
    const sample = demoCars.find(car => car.id === id);
    if (sample) return NextResponse.json({ car: sample, source: 'demo' });
  }
  return NextResponse.json({ error: 'Car not found.' }, { status: 404 });
}

export async function DELETE(request: NextRequest, context: Context) {
  const admin = isAdminRequest(request);
  const vendor = isVendorSession(request);
  if (!admin && !vendor) return NextResponse.json({ error: 'Sign in to manage listings.' }, { status: 401 });
  const { id } = await context.params;
  try {
    const db = await getDb();
    if (vendor && !await db.collection('vendors').findOne({ id: vendor.vendorId, status: 'active' }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'This vendor account is suspended.' }, { status: 403 });
    }
    const filter = admin ? { id } : { id, vendorId: vendor?.vendorId };
    const result = await db.collection('cars').deleteOne(filter);
    if (!result.deletedCount) return NextResponse.json({ error: 'Listing not found in your workspace.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Listing could not be removed.' }, { status: 503 }); }
}
