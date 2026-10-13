import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../server/auth';
import { ensureDevelopmentDemoInventory } from '../../../../server/demo-inventory';
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
    return NextResponse.json({ cars: cars.map(car => ({ ...car, id: String(car.id ?? car._id), _id: undefined, imageId: undefined, image: car.imageId ? `/api/photos/${encodeURIComponent(String(car.imageId))}` : car.image })) });
  } catch { return NextResponse.json({ error: 'Inventory is temporarily unavailable.' }, { status: 503 }); }
}
