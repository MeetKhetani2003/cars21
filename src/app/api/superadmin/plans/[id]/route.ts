import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(400), price: z.number().min(0).max(100_000_000), durationDays: z.number().int().min(1).max(3650), maxListings: z.number().int().min(1).max(10_000), maxImagesPerListing: z.number().int().min(1).max(20), features: z.object({ listingAnalytics: z.boolean(), buyerInquiries: z.boolean(), inspectionUploads: z.boolean(), publicBusinessProfile: z.boolean(), priorityPlacement: z.boolean() }), active: z.boolean(), public: z.boolean() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the plan details and limits.' }, { status: 400 });
  try {
    const db = await getDb();
    const result = await db.collection('subscription_plans').updateOne({ id }, { $set: { ...parsed.data, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
    const currentAssignments = await db.collection<Record<string, unknown>>('vendor_subscriptions').find({ planId: id, status: 'active', endAt: { $gt: new Date() } }).toArray();
    const vendorIds = currentAssignments.map(item => String(item.vendorId ?? '')).filter(Boolean);
    if (vendorIds.length) await db.collection('cars').updateMany({ vendorId: { $in: vendorIds } }, { $set: { priorityPlacement: parsed.data.features.priorityPlacement, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Plan could not be updated.' }, { status: 503 }); }
}
