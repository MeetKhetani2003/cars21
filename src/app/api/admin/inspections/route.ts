import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  try {
    const db = await getDb();
    const cars = await db.collection<Record<string, unknown>>('cars').find({ vendorId: { $exists: true, $ne: '' }, inspection: { $ne: null } }).sort({ submittedForInspectionAt: -1 }).limit(500).toArray();
    const vendorIds = [...new Set(cars.map(car => String(car.vendorId ?? '')).filter(Boolean))];
    const vendors = await db.collection<Record<string, unknown>>('vendors').find({ id: { $in: vendorIds } }).project({ id: 1, businessName: 1, email: 1 }).toArray();
    const vendorMap = new Map(vendors.map(vendor => [String(vendor.id), vendor]));
    return NextResponse.json({ inspections: cars.map(car => {
      const vendor = vendorMap.get(String(car.vendorId));
      const inspection = (car.inspection || {}) as Record<string, unknown>;
      return { id: String(car.id), make: car.make, model: car.model, variant: car.variant, year: car.year, city: car.city, status: car.status, reviewStatus: car.inspectionReviewStatus || 'pending', reviewNote: car.inspectionReviewNote || '', submittedAt: car.submittedForInspectionAt || car.updatedAt, vendor: { id: String(car.vendorId), name: String(vendor?.businessName ?? 'Dealer'), email: String(vendor?.email ?? '') }, inspection: { exterior: inspection.exterior || '', interior: inspection.interior || '', engine: inspection.engine || '', tyres: inspection.tyres || '', electronics: inspection.electronics || '', documents: inspection.documents || '', roadTest: inspection.roadTest || '', accidentHistory: inspection.accidentHistory || '', notes: inspection.notes || '', evidencePhotoIds: Array.isArray(inspection.evidencePhotoIds) ? inspection.evidencePhotoIds : [] } };
    }) });
  } catch { return NextResponse.json({ error: 'Inspection submissions are temporarily unavailable.' }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const schema = z.object({ carId: z.string().min(2).max(80), reviewStatus: z.enum(['approved', 'changes_requested', 'rejected']), reviewNote: z.string().trim().max(1000).default('') });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a review decision and check the review note.' }, { status: 400 });
  try {
    const result = await (await getDb()).collection('cars').updateOne({ id: parsed.data.carId, vendorId: { $exists: true, $ne: '' }, inspection: { $ne: null } }, { $set: { inspectionReviewStatus: parsed.data.reviewStatus, inspectionReviewNote: parsed.data.reviewNote, inspectionReviewedAt: new Date(), inspectionReviewedBy: 'superadmin', updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Inspection submission not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Inspection decision could not be saved.' }, { status: 503 }); }
}
