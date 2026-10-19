import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const assignSchema = z.object({ vendorId: z.string().min(2).max(100), planId: z.string().min(2).max(80), durationDays: z.number().int().min(1).max(3650).optional() });

export async function GET(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  try {
    const db = await getDb();
    const [assignments, vendors, plans] = await Promise.all([
      db.collection<Record<string, unknown>>('vendor_subscriptions').find({}).sort({ createdAt: -1 }).limit(500).toArray(),
      db.collection<Record<string, unknown>>('vendors').find({}).project({ id: 1, name: 1, businessName: 1, email: 1, city: 1, status: 1 }).sort({ businessName: 1 }).limit(500).toArray(),
      db.collection<Record<string, unknown>>('subscription_plans').find({}).sort({ createdAt: -1 }).toArray(),
    ]);
    const vendorMap = new Map(vendors.map(vendor => [String(vendor.id), vendor]));
    const planMap = new Map(plans.map(plan => [String(plan.id), plan]));
    return NextResponse.json({ vendors: vendors.map(v => ({ id: String(v.id), name: String(v.businessName ?? v.name ?? 'Dealer'), email: String(v.email ?? ''), city: String(v.city ?? ''), status: String(v.status ?? '') })), plans: plans.map(({ _id, ...plan }) => plan), subscriptions: assignments.map(({ _id, ...item }) => ({ ...item, vendor: vendorMap.get(String(item.vendorId)), plan: planMap.get(String(item.planId)) })) });
  } catch { return NextResponse.json({ error: 'Subscriptions are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = assignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a vendor and subscription plan.' }, { status: 400 });
  try {
    const db = await getDb();
    const [vendor, plan] = await Promise.all([
      db.collection<Record<string, unknown>>('vendors').findOne({ id: parsed.data.vendorId, status: 'active' }),
      db.collection<Record<string, unknown>>('subscription_plans').findOne({ id: parsed.data.planId, active: true }),
    ]);
    if (!vendor) return NextResponse.json({ error: 'Choose an active vendor.' }, { status: 404 });
    if (!plan) return NextResponse.json({ error: 'Choose an active plan.' }, { status: 404 });
    const now = new Date();
    const durationDays = parsed.data.durationDays || Number(plan.durationDays);
    const assignment = { vendorId: parsed.data.vendorId, planId: parsed.data.planId, planName: String(plan.name), status: 'active', startAt: now, endAt: new Date(now.getTime() + durationDays * 86_400_000), assignedBy: 'superadmin', createdAt: now, updatedAt: now };
    const collection = db.collection('vendor_subscriptions');
    await collection.updateMany({ vendorId: parsed.data.vendorId, status: 'active' }, { $set: { status: 'replaced', updatedAt: now } });
    const result = await collection.insertOne(assignment);
    await db.collection('cars').updateMany({ vendorId: parsed.data.vendorId }, { $set: { priorityPlacement: Boolean((plan.features as Record<string, unknown> | undefined)?.priorityPlacement), updatedAt: now } });
    return NextResponse.json({ subscription: { ...assignment, id: result.insertedId.toString() } }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Subscription could not be assigned.' }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = z.object({ vendorId: z.string().min(2).max(100), action: z.literal('cancel') }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose an active vendor subscription to cancel.' }, { status: 400 });
  try {
    const db = await getDb();
    const result = await db.collection('vendor_subscriptions').updateOne({ vendorId: parsed.data.vendorId, status: 'active' }, { $set: { status: 'cancelled', updatedAt: new Date(), cancelledBy: 'superadmin' } });
    if (!result.matchedCount) return NextResponse.json({ error: 'No active subscription was found for this vendor.' }, { status: 404 });
    await db.collection('cars').updateMany({ vendorId: parsed.data.vendorId }, { $set: { priorityPlacement: false, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Subscription could not be cancelled.' }, { status: 503 }); }
}
