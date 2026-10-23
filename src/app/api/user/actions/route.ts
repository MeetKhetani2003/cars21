import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('search'), label: z.string().trim().max(240), targetType: z.literal('search') }),
  z.object({ action: z.literal('car_view'), carId: z.string().min(2).max(80) }),
  z.object({ action: z.literal('vendor_view'), vendorSlug: z.string().min(2).max(180) }),
  z.object({ 
    action: z.literal('emi_calculate'), 
    carPrice: z.number().optional(),
    downPayment: z.number().optional(),
    loanAmount: z.number().optional(), 
    tenureMonths: z.number().optional(), 
    interestRate: z.number().optional(),
    monthlyEmi: z.number().optional(),
    label: z.string().trim().max(240).optional(),
    targetType: z.literal('emi').optional()
  }),
]);

async function buyerAccount(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return null;
  const buyer = await (await getDb()).collection<Record<string, unknown>>('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } }, { projection: { id: 1, name: 1, email: 1 } });
  return buyer ? { session, buyer } : null;
}

export async function POST(request: NextRequest) {
  const auth = await buyerAccount(request).catch(() => null);
  if (!auth) return NextResponse.json({ error: 'Google sign-in is required to save account activity.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Activity could not be recorded.' }, { status: 400 });
  try {
    const db = await getDb();
    const common = { userId: auth.session.sub, clientName: String(auth.buyer.name || auth.session.name), clientEmail: String(auth.buyer.email || auth.session.email || ''), createdAt: new Date() };
    let action: Record<string, unknown>;
    if (parsed.data.action === 'search') {
      action = { ...common, action: 'search', targetType: 'search', targetLabel: parsed.data.label.slice(0, 240) || 'All cars' };
    } else if (parsed.data.action === 'car_view') {
      const car = await db.collection<Record<string, unknown>>('cars').findOne({ id: parsed.data.carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
      if (!car) return NextResponse.json({ ok: true, tracked: false });
      const vendorId = String(car.vendorId ?? '');
      const vendor = vendorId ? await db.collection<Record<string, unknown>>('vendors').findOne({ id: vendorId, status: 'active' }, { projection: { name: 1, businessName: 1 } }) : null;
      action = { ...common, action: 'car_view', targetType: 'car', carId: String(car.id), carLabel: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim(), vendorId: vendor ? vendorId : '', vendorName: vendor ? String(vendor.businessName || vendor.name || 'Dealer') : '', targetLabel: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() };
    } else if (parsed.data.action === 'emi_calculate') {
      const emiFormatted = parsed.data.monthlyEmi ? `₹${Math.round(parsed.data.monthlyEmi).toLocaleString('en-IN')}/mo` : '';
      const loanFormatted = parsed.data.loanAmount ? `₹${Math.round(parsed.data.loanAmount).toLocaleString('en-IN')}` : '';
      const label = parsed.data.label || `Calculated EMI ${emiFormatted} on ${loanFormatted} loan (${parsed.data.tenureMonths || 60}m @ ${parsed.data.interestRate || 10.5}%)`;
      action = {
        ...common,
        action: 'emi_calculate',
        targetType: 'emi',
        carPrice: parsed.data.carPrice,
        downPayment: parsed.data.downPayment,
        loanAmount: parsed.data.loanAmount,
        tenureMonths: parsed.data.tenureMonths,
        interestRate: parsed.data.interestRate,
        monthlyEmi: parsed.data.monthlyEmi,
        targetLabel: label.slice(0, 240)
      };
    } else {
      const slug = parsed.data.vendorSlug;
      const vendors = db.collection<Record<string, unknown>>('vendors');
      const vendor = await vendors.findOne({ status: 'active', slug }, { projection: { id: 1, name: 1, businessName: 1 } })
        ?? (await vendors.find({ status: 'active' }).project({ id: 1, name: 1, businessName: 1 }).limit(2000).toArray()).find(item => vendorSlug(String(item.businessName ?? item.name ?? ''), String(item.id ?? item._id)) === slug);
      if (!vendor) return NextResponse.json({ ok: true, tracked: false });
      const id = String(vendor.id ?? vendor._id);
      const name = String(vendor.businessName || vendor.name || 'Dealer');
      action = { ...common, action: 'vendor_view', targetType: 'vendor', vendorId: id, vendorName: name, targetLabel: name };
    }
    const collection = db.collection('user_actions');
    await Promise.all([collection.createIndex({ userId: 1, createdAt: -1 }), collection.createIndex({ carId: 1, createdAt: -1 }), collection.createIndex({ vendorId: 1, createdAt: -1 })]);
    await collection.insertOne(action);
    return NextResponse.json({ ok: true, tracked: true });
  } catch { return NextResponse.json({ error: 'Activity history is temporarily unavailable.' }, { status: 503 }); }
}
