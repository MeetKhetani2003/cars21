import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';
import { cars as demoCars } from '../../../../data';

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
  z.object({
    action: z.literal('test_drive'),
    carId: z.string().min(2).max(80),
    preferredDate: z.string().optional(),
    preferredSlot: z.string().optional(),
    locationType: z.enum(['doorstep', 'hub']).optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal('express_interest'),
    carId: z.string().min(2).max(80),
    interestType: z.enum(['offer', 'reserve', 'callback', 'inspection', 'general']).optional(),
    offerAmount: z.number().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  }),
]);

async function buyerAccount(request: NextRequest) {
  const session = getSession(request);
  if (!session) return null;
  if (session.role === 'buyer') {
    const buyer = await (await getDb()).collection<Record<string, unknown>>('buyers').findOne({ id: session.sub }, { projection: { id: 1, name: 1, email: 1 } });
    return { session, buyer: buyer || { id: session.sub, name: session.name || 'Cars21 Member', email: session.email || '' } };
  }
  // Allow superadmin, admin or vendor sessions acting on frontend
  return { session, buyer: { id: session.sub, name: session.name || 'Cars21 Member', email: session.email || '' } };
}

export async function POST(request: NextRequest) {
  const auth = await buyerAccount(request).catch(() => null);
  if (!auth) return NextResponse.json({ error: 'Google sign-in is required to save account activity.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Activity could not be recorded.' }, { status: 400 });
  try {
    const db = await getDb();
    const common = { userId: auth.session.sub, clientName: String(auth.buyer.name || auth.session.name), clientEmail: String(auth.buyer.email || auth.session.email || ''), createdAt: new Date() };
    const data = parsed.data;
    let action: Record<string, unknown>;

    if (data.action === 'search') {
      action = { ...common, action: 'search', targetType: 'search', targetLabel: data.label.slice(0, 240) || 'All cars' };
    } else if (data.action === 'car_view') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
      if (!car) {
        car = demoCars.find(c => c.id === carId) || null;
      }
      if (!car) return NextResponse.json({ ok: true, tracked: false });
      const vendorId = String(car.vendorId ?? '');
      const vendor = vendorId ? await db.collection<Record<string, unknown>>('vendors').findOne({ id: vendorId, status: 'active' }, { projection: { name: 1, businessName: 1 } }) : null;
      action = { ...common, action: 'car_view', targetType: 'car', carId: String(car.id), carLabel: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim(), vendorId: vendor ? vendorId : '', vendorName: vendor ? String(vendor.businessName || vendor.name || 'Dealer') : '', targetLabel: `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() };
    } else if (data.action === 'test_drive') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
      if (!car) {
        car = demoCars.find(c => c.id === carId) || null;
      }
      if (!car) return NextResponse.json({ ok: true, tracked: false });
      const vendorId = String(car.vendorId ?? '');
      const vendor = vendorId ? await db.collection<Record<string, unknown>>('vendors').findOne({ id: vendorId, status: 'active' }, { projection: { name: 1, businessName: 1 } }) : null;
      const carLabel = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim();
      const locText = data.locationType === 'hub' ? 'Cars21 Hub' : 'Doorstep';
      const slotText = data.preferredSlot ? ` @ ${data.preferredSlot}` : '';
      const dateText = data.preferredDate ? ` (${data.preferredDate}${slotText})` : '';
      const targetLabel = `Scheduled Test Drive: ${carLabel}${dateText} · ${locText}`;
      action = {
        ...common,
        action: 'test_drive',
        targetType: 'car',
        carId: String(car.id),
        carLabel,
        vendorId: vendor ? vendorId : '',
        vendorName: vendor ? String(vendor.businessName || vendor.name || 'Dealer') : '',
        targetLabel: targetLabel.slice(0, 240),
        preferredDate: data.preferredDate || '',
        preferredSlot: data.preferredSlot || '',
        locationType: data.locationType || 'doorstep',
        phone: data.phone || '',
        notes: data.notes || '',
      };
    } else if (data.action === 'express_interest') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
      if (!car) {
        car = demoCars.find(c => c.id === carId) || null;
      }
      if (!car) return NextResponse.json({ ok: true, tracked: false });
      const vendorId = String(car.vendorId ?? '');
      const vendor = vendorId ? await db.collection<Record<string, unknown>>('vendors').findOne({ id: vendorId, status: 'active' }, { projection: { name: 1, businessName: 1 } }) : null;
      const carLabel = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim();
      const offerText = data.offerAmount ? ` · Offer: ₹${data.offerAmount.toLocaleString('en-IN')}` : '';
      const typeText = data.interestType === 'reserve' ? 'Reservation Request' : data.interestType === 'offer' ? 'Price Offer' : 'Callback Request';
      const targetLabel = `${typeText}: ${carLabel}${offerText}`;
      action = {
        ...common,
        action: 'express_interest',
        targetType: 'car',
        carId: String(car.id),
        carLabel,
        vendorId: vendor ? vendorId : '',
        vendorName: vendor ? String(vendor.businessName || vendor.name || 'Dealer') : '',
        targetLabel: targetLabel.slice(0, 240),
        interestType: data.interestType || 'general',
        offerAmount: data.offerAmount || null,
        phone: data.phone || '',
        notes: data.notes || '',
      };
    } else if (data.action === 'emi_calculate') {
      const emiFormatted = data.monthlyEmi ? `₹${Math.round(data.monthlyEmi).toLocaleString('en-IN')}/mo` : '';
      const loanFormatted = data.loanAmount ? `₹${Math.round(data.loanAmount).toLocaleString('en-IN')}` : '';
      const label = data.label || `Calculated EMI ${emiFormatted} on ${loanFormatted} loan (${data.tenureMonths || 60}m @ ${data.interestRate || 10.5}%)`;
      action = {
        ...common,
        action: 'emi_calculate',
        targetType: 'emi',
        carPrice: data.carPrice,
        downPayment: data.downPayment,
        loanAmount: data.loanAmount,
        tenureMonths: data.tenureMonths,
        interestRate: data.interestRate,
        monthlyEmi: data.monthlyEmi,
        targetLabel: label.slice(0, 240)
      };
    } else {
      const slug = data.vendorSlug;
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
    return NextResponse.json({ ok: true, tracked: true, action: parsed.data.action, targetLabel: action.targetLabel });
  } catch { return NextResponse.json({ error: 'Activity history is temporarily unavailable.' }, { status: 503 }); }
}
