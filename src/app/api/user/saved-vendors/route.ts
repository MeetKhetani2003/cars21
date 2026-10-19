import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorSlug as makeVendorSlug } from '../../../../lib/vendor-slug';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ vendorSlug: z.string().min(2).max(180), saved: z.boolean() });

async function buyerFor(request: NextRequest) {
  const session = getSession(request); if (session?.role !== 'buyer') return null;
  const db = await getDb(); const buyer = await db.collection<Record<string, unknown>>('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } }, { projection: { id: 1, name: 1, email: 1 } });
  return buyer ? { db, session, buyer } : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await buyerFor(request); if (!auth) return NextResponse.json({ error: 'Sign in with Google to view saved dealers.' }, { status: 401 });
    const saved = await auth.db.collection<Record<string, unknown>>('buyer_saved_vendors').find({ userId: auth.session.sub }).sort({ updatedAt: -1 }).toArray();
    const ids = saved.map(item => String(item.vendorId));
    const vendorDocs = ids.length ? await auth.db.collection<Record<string, unknown>>('vendors').find({ id: { $in: ids }, status: 'active' }).toArray() : [];
    const counts = vendorDocs.length ? await auth.db.collection<Record<string, unknown>>('cars').aggregate([{ $match: { vendorId: { $in: ids }, $or: [{ status: 'active' }, { status: { $exists: false } }] } }, { $group: { _id: '$vendorId', count: { $sum: 1 } } }]).toArray() : [];
    const countById = new Map(counts.map(item => [String(item._id), Number(item.count || 0)]));
    const byId = new Map(vendorDocs.map(item => { const id = String(item.id ?? item._id); const businessName = String(item.businessName || item.name || 'Local car dealer'); return [id, { id, slug: makeVendorSlug(businessName, id), name: String(item.name || businessName), businessName, city: String(item.city || ''), listingCount: countById.get(id) || 0 }]; }));
    const vendors = ids.map(id => byId.get(id)).filter((vendor): vendor is NonNullable<typeof vendor> => Boolean(vendor));
    return NextResponse.json({ ids: vendors.map(vendor => vendor.id), vendors });
  } catch { return NextResponse.json({ error: 'Saved dealers are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid dealer.' }, { status: 400 });
  try {
    const auth = await buyerFor(request); if (!auth) return NextResponse.json({ error: 'Sign in with Google to save dealers.' }, { status: 401 });
    const vendors = auth.db.collection<Record<string, unknown>>('vendors');
    const allVendors = await vendors.find({ status: 'active' }).project({ id: 1, name: 1, businessName: 1, slug: 1 }).limit(2000).toArray();
    const vendor = allVendors.find(item => String(item.slug || '') === parsed.data.vendorSlug || makeVendorSlug(String(item.businessName || item.name || ''), String(item.id ?? item._id)) === parsed.data.vendorSlug);
    if (!vendor) return NextResponse.json({ error: 'This dealer is no longer available.' }, { status: 404 });
    const vendorId = String(vendor.id ?? vendor._id); const collection = auth.db.collection('buyer_saved_vendors');
    await collection.createIndex({ userId: 1, vendorId: 1 }, { unique: true });
    const now = new Date();
    if (parsed.data.saved) await collection.updateOne({ userId: auth.session.sub, vendorId }, { $setOnInsert: { userId: auth.session.sub, vendorId, createdAt: now }, $set: { updatedAt: now } }, { upsert: true });
    else await collection.deleteOne({ userId: auth.session.sub, vendorId });
    await auth.db.collection('user_actions').insertOne({ userId: auth.session.sub, clientName: String(auth.buyer.name || auth.session.name), clientEmail: String(auth.buyer.email || auth.session.email || ''), action: parsed.data.saved ? 'vendor_save' : 'vendor_unsave', targetType: 'vendor', targetLabel: String(vendor.businessName || vendor.name || 'Dealer'), vendorId, vendorName: String(vendor.businessName || vendor.name || 'Dealer'), createdAt: now }).catch(() => null);
    return NextResponse.json({ saved: parsed.data.saved, vendorId, vendorSlug: parsed.data.vendorSlug });
  } catch { return NextResponse.json({ error: 'Dealer could not be saved.' }, { status: 503 }); }
}
