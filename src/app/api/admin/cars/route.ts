import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminRequest } from '../../../../server/auth';
import { ensureDevelopmentDemoInventory } from '../../../../server/demo-inventory';
import { vendorSlug as makeVendorSlug } from '../../../../lib/vendor-slug';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    const session = getSession(request);
    const db = await getDb();
    const collection = db.collection<Record<string, unknown>>('cars');
    await ensureDevelopmentDemoInventory();

    let carQuery: Record<string, unknown> = {};
    if (session?.role === 'admin') {
      // Find all vendors assigned to or created by this admin
      const assignedVendors = await db.collection<Record<string, unknown>>('vendors').find({
        $or: [
          { assignedAdminId: session.sub },
          { 'addedBy.id': session.sub }
        ]
      }).project({ id: 1 }).toArray();
      const assignedVendorIds = assignedVendors.map(v => String(v.id ?? v._id));
      carQuery = {
        $or: [
          { vendorId: { $in: assignedVendorIds } },
          { 'addedBy.id': session.sub }
        ]
      };
    }

    const cars = await collection.find(carQuery).sort({ updatedAt: -1, year: -1 }).limit(300).toArray();
    const vendorIds = [...new Set(cars.map(car => String(car.vendorId ?? '')).filter(Boolean))];
    const vendorDocs = vendorIds.length ? await db.collection<Record<string, unknown>>('vendors').find({ id: { $in: vendorIds } }).project({ id: 1, name: 1, businessName: 1, addedBy: 1 }).toArray() : [];
    const vendorMap = new Map(vendorDocs.map(vendor => { const id = String(vendor.id ?? ''); const name = String(vendor.businessName ?? vendor.name ?? 'Vendor'); return [id, { name, slug: makeVendorSlug(name, id) }]; }));
    return NextResponse.json({
      cars: cars.map(car => {
        const id = String(car.id ?? car._id);
        const vendorId = String(car.vendorId ?? '');
        const vendor = vendorMap.get(vendorId);
        const documentPhotoId = car.documentPhotoId ? String(car.documentPhotoId) : undefined;
        const verificationStatus = (car.verificationStatus as string) || (documentPhotoId ? 'under_verification' : 'unverified');
        return {
          ...car,
          id,
          vendorName: vendor?.name ?? '',
          vendorSlug: vendor?.slug ?? '',
          _id: undefined,
          imageId: undefined,
          image: car.imageId ? `/api/photos/${encodeURIComponent(String(car.imageId))}` : car.image,
          documentPhotoId,
          documentNumber: car.documentNumber ? String(car.documentNumber) : undefined,
          documentType: car.documentType ? String(car.documentType) : 'RC / Registration Certificate',
          verificationStatus,
          verificationNote: car.verificationNote ? String(car.verificationNote) : undefined,
          verifiedBy: car.verifiedBy || null,
        };
      })
    });
  } catch { return NextResponse.json({ error: 'Inventory is temporarily unavailable.' }, { status: 503 }); }
}
