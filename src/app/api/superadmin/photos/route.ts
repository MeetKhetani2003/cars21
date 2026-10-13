import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdminRequest } from '../../../../server/auth';
import { getDb, getPhotoBucket } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  try {
    const db = await getDb();
    const bucket = await getPhotoBucket();
    const files = await bucket.find({}).sort({ uploadDate: -1 }).limit(300).toArray();
    const ids = files.map(file => file._id.toString());
    const cars = ids.length ? await db.collection<Record<string, unknown>>('cars').find({ imageId: { $in: ids } }, { projection: { id: 1, make: 1, model: 1, year: 1, imageId: 1 } }).toArray() : [];
    const usedBy = new Map(cars.map(car => [String(car.imageId), { id: String(car.id ?? ''), label: `${car.year ?? ''} ${car.make ?? ''} ${car.model ?? ''}`.trim() }]));
    return NextResponse.json({ photos: files.map(file => ({ id: file._id.toString(), filename: file.filename, contentType: file.metadata?.contentType || 'image/*', length: file.length, uploadDate: file.uploadDate, usedBy: usedBy.get(file._id.toString()) || null })) });
  } catch { return NextResponse.json({ error: 'Photo library is temporarily unavailable.' }, { status: 503 }); }
}
