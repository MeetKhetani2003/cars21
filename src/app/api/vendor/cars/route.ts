import { NextRequest, NextResponse } from 'next/server';
import { isVendorSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = isVendorSession(request);
  if (!session?.vendorId) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  try {
    const db = await getDb();
    const vendor = await db.collection('vendors').findOne({ id: session.vendorId, status: 'active' }, { projection: { _id: 1 } });
    if (!vendor) return NextResponse.json({ error: 'This vendor account is suspended.' }, { status: 403 });
    const cars = await db.collection<Record<string, unknown>>('cars').find({ vendorId: session.vendorId }).sort({ updatedAt: -1 }).limit(300).toArray();
    return NextResponse.json({ cars: cars.map(car => ({ ...car, id: String(car.id ?? car._id), _id: undefined, imageId: undefined, image: car.imageId ? `/api/photos/${encodeURIComponent(String(car.imageId))}` : car.image })) });
  } catch { return NextResponse.json({ error: 'Your inventory is temporarily unavailable.' }, { status: 503 }); }
}
