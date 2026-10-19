import { NextRequest, NextResponse } from 'next/server';
import { isVendorSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';
import { ensureDevelopmentDemoVendorProfile } from '../../../../server/demo-vendor';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { getVendorSubscription } from '../../../../server/vendor-subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = isVendorSession(request);
  if (!session?.vendorId) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  try {
    await ensureDevelopmentDemoVendorProfile(session.vendorId);
    const db = await getDb();
    const vendor = await db.collection<Record<string, unknown>>('vendors').findOne({ id: session.vendorId, status: 'active' }, { projection: { _id: 1, id: 1, name: 1, businessName: 1, email: 1, inquiryEmail: 1, inquiryWhatsApp: 1, phone: 1, city: 1, area: 1, address: 1, description: 1, website: 1, workingHours: 1, establishedYear: 1, specialties: 1, logoPhotoId: 1, coverPhotoId: 1, shopPhotoIds: 1 } });
    if (!vendor) return NextResponse.json({ error: 'This vendor account is suspended.' }, { status: 403 });
    const [cars, subscription] = await Promise.all([
      db.collection<Record<string, unknown>>('cars').find({ vendorId: session.vendorId }).sort({ updatedAt: -1 }).limit(300).toArray(),
      getVendorSubscription(session.vendorId),
    ]);
    const vendorId = session.vendorId;
    const businessName = String(vendor.businessName ?? vendor.name ?? 'Dealer');
    return NextResponse.json({ vendor: { id: vendorId, name: String(vendor.name ?? ''), businessName, email: String(vendor.email ?? ''), inquiryEmail: String(vendor.inquiryEmail ?? vendor.email ?? ''), inquiryWhatsApp: String(vendor.inquiryWhatsApp ?? vendor.phone ?? ''), phone: String(vendor.phone ?? ''), city: String(vendor.city ?? ''), area: String(vendor.area ?? ''), address: String(vendor.address ?? ''), description: String(vendor.description ?? ''), website: String(vendor.website ?? ''), workingHours: String(vendor.workingHours ?? ''), establishedYear: Number(vendor.establishedYear ?? 0) || null, specialties: Array.isArray(vendor.specialties) ? vendor.specialties : [], logoPhotoId: String(vendor.logoPhotoId ?? ''), coverPhotoId: String(vendor.coverPhotoId ?? ''), shopPhotoIds: Array.isArray(vendor.shopPhotoIds) ? vendor.shopPhotoIds : [], profileUrl: `/dealers/${vendorSlug(businessName, vendorId)}`, subscription }, cars: cars.map(car => ({ ...car, id: String(car.id ?? car._id), vendorName: businessName, vendorSlug: vendorSlug(businessName, vendorId), _id: undefined, imageId: undefined, image: car.imageId ? `/api/photos/${encodeURIComponent(String(car.imageId))}` : car.image, photoIds: Array.isArray(car.photoIds) ? car.photoIds : [], inspection: car.inspection || null })) });
  } catch { return NextResponse.json({ error: 'Your inventory is temporarily unavailable.' }, { status: 503 }); }
}
