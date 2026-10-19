import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const planSchema = z.object({
  name: z.string().trim().min(2).max(80), description: z.string().trim().max(400).default(''),
  price: z.number().min(0).max(100_000_000), durationDays: z.number().int().min(1).max(3650),
  maxListings: z.number().int().min(1).max(10_000), maxImagesPerListing: z.number().int().min(1).max(20),
  features: z.object({ listingAnalytics: z.boolean(), buyerInquiries: z.boolean(), inspectionUploads: z.boolean(), publicBusinessProfile: z.boolean(), priorityPlacement: z.boolean() }),
  active: z.boolean().default(true), public: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  try {
    const plans = await (await getDb()).collection('subscription_plans').find({}).sort({ createdAt: -1 }).limit(200).toArray();
    return NextResponse.json({ plans: plans.map(({ _id, ...plan }) => plan) });
  } catch { return NextResponse.json({ error: 'Subscription plans are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the plan details and limits.' }, { status: 400 });
  const plan = { id: randomBytes(12).toString('hex'), ...parsed.data, createdAt: new Date(), updatedAt: new Date() };
  try { await (await getDb()).collection('subscription_plans').insertOne(plan); return NextResponse.json({ plan }, { status: 201 }); }
  catch { return NextResponse.json({ error: 'Plan could not be saved.' }, { status: 503 }); }
}
