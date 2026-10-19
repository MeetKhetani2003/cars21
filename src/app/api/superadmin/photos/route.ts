import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdminRequest } from '../../../../server/auth';
import { getDb, getPhotoBucket } from '../../../../server/mongodb';
import { vendorSlug } from '../../../../lib/vendor-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  try {
    const db = await getDb();
    const bucket = await getPhotoBucket();
    const files = await bucket.find({}).sort({ uploadDate: -1 }).limit(300).toArray();
    const ids = files.map(file => file._id.toString());
    const [cars, vendors] = ids.length ? await Promise.all([
      db.collection<Record<string, unknown>>('cars').find({ $or: [{ imageId: { $in: ids } }, { photoIds: { $in: ids } }, { 'inspection.evidencePhotoIds': { $in: ids } }] }, { projection: { id: 1, make: 1, model: 1, year: 1, imageId: 1, photoIds: 1, 'inspection.evidencePhotoIds': 1 } }).toArray(),
      db.collection<Record<string, unknown>>('vendors').find({ $or: [{ logoPhotoId: { $in: ids } }, { coverPhotoId: { $in: ids } }, { shopPhotoIds: { $in: ids } }] }, { projection: { id: 1, name: 1, businessName: 1, logoPhotoId: 1, coverPhotoId: 1, shopPhotoIds: 1 } }).toArray(),
    ]) : [[], []];
    const usedBy = new Map<string, { id: string; label: string; kind: 'car' | 'vendor'; href: string }>();
    for (const car of cars) {
      const carId = String(car.id ?? ''); const label = `${car.year ?? ''} ${car.make ?? ''} ${car.model ?? ''}`.trim();
      const photoIds = [car.imageId, ...(Array.isArray(car.photoIds) ? car.photoIds : []), ...((car.inspection as Record<string, unknown> | undefined)?.evidencePhotoIds as string[] || [])].filter(Boolean).map(String);
      for (const photoId of photoIds) if (ids.includes(photoId)) usedBy.set(photoId, { id: carId, label: `${label} · listing / inspection`, kind: 'car', href: `/car/${encodeURIComponent(carId)}` });
    }
    for (const vendor of vendors) {
      const id = String(vendor.id ?? vendor._id ?? ''); const businessName = String(vendor.businessName ?? vendor.name ?? 'Dealer');
      const photoIds = [vendor.logoPhotoId, vendor.coverPhotoId, ...(Array.isArray(vendor.shopPhotoIds) ? vendor.shopPhotoIds : [])].map(String);
      for (const photoId of photoIds) if (ids.includes(photoId)) usedBy.set(photoId, { id, label: businessName, kind: 'vendor', href: `/dealers/${vendorSlug(businessName, id)}` });
    }
    return NextResponse.json({ photos: files.map(file => ({ id: file._id.toString(), filename: file.filename, contentType: file.metadata?.contentType || 'image/*', length: file.length, uploadDate: file.uploadDate, usedBy: usedBy.get(file._id.toString()) || null })) });
  } catch { return NextResponse.json({ error: 'Photo library is temporarily unavailable.' }, { status: 503 }); }
}
