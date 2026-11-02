import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ObjectId, Filter, Document } from 'mongodb';
import { isSuperAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildIdFilter(id: string): Filter<Document> {
  const clauses: Filter<Document>[] = [{ id }];
  if (ObjectId.isValid(id)) {
    clauses.push({ _id: new ObjectId(id) });
  }
  return { $or: clauses };
}

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(400).optional(),
  price: z.number().min(0).max(100_000_000).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  maxListings: z.number().int().min(1).max(10_000).optional(),
  maxImagesPerListing: z.number().int().min(1).max(20).optional(),
  features: z.object({
    listingAnalytics: z.boolean().default(true),
    buyerInquiries: z.boolean().default(true),
    inspectionUploads: z.boolean().default(true),
    publicBusinessProfile: z.boolean().default(true),
    priorityPlacement: z.boolean().default(false)
  }).passthrough().optional(),
  active: z.boolean().optional(),
  public: z.boolean().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Check the plan details and limits.' }, { status: 400 });
  try {
    const db = await getDb();
    const filter = buildIdFilter(id);
    const result = await db.collection('subscription_plans').updateOne(filter, { $set: { ...parsed.data, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
    const currentAssignments = await db.collection<Record<string, unknown>>('vendor_subscriptions').find({ planId: id, status: 'active', endAt: { $gt: new Date() } }).toArray();
    const vendorIds = currentAssignments.map(item => String(item.vendorId ?? '')).filter(Boolean);
    if (vendorIds.length && parsed.data.features?.priorityPlacement !== undefined) {
      await db.collection('cars').updateMany({ vendorId: { $in: vendorIds } }, { $set: { priorityPlacement: parsed.data.features.priorityPlacement, updatedAt: new Date() } });
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Plan could not be updated.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const { id } = await context.params;
  try {
    const db = await getDb();
    const filter = buildIdFilter(id);
    const result = await db.collection('subscription_plans').deleteOne(filter);
    if (!result.deletedCount) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Plan could not be deleted.' }, { status: 503 }); }
}
