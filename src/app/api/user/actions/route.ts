import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { getSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const actionBaseSchema = z.object({
  leadUserId: z.string().trim().max(120).optional(),
  leadName: z.string().trim().max(100).optional(),
  leadPhone: z.string().trim().max(30).optional(),
  leadCity: z.string().trim().max(80).optional(),
  visitorId: z.string().trim().max(120).optional(),
});

const schema = z.intersection(
  actionBaseSchema,
  z.discriminatedUnion('action', [
    z.object({ action: z.literal('search'), label: z.string().trim().max(240), targetType: z.literal('search').optional() }),
    z.object({ action: z.literal('car_view'), carId: z.string().min(2).max(80) }),
    z.object({ action: z.literal('vendor_view'), vendorSlug: z.string().min(2).max(180), details: z.string().optional() }),
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
    z.object({
      action: z.literal('button_click'),
      buttonName: z.string().trim().max(120),
      carId: z.string().optional(),
      details: z.string().max(300).optional(),
      targetType: z.string().max(40).optional(),
    }),
    z.object({
      action: z.literal('inspection_view'),
      carId: z.string().min(2).max(80),
      details: z.string().max(300).optional(),
    }),
    z.object({
      action: z.literal('report_download'),
      carId: z.string().min(2).max(80),
      details: z.string().max(300).optional(),
    }),
    z.object({
      action: z.literal('contact_dealer'),
      carId: z.string().optional(),
      vendorSlug: z.string().optional(),
      channel: z.enum(['whatsapp', 'call']).optional(),
      phone: z.string().optional(),
    }),
    z.object({
      action: z.literal('reveal_phone'),
      carId: z.string().optional(),
      vendorSlug: z.string().optional(),
      details: z.string().optional(),
    }),
    z.object({
      action: z.literal('buy_lead_captured'),
      phone: z.string().optional(),
      city: z.string().optional(),
      name: z.string().optional(),
      carId: z.string().optional(),
      details: z.string().optional(),
    }),
    z.object({
      action: z.literal('wishlist_add'),
      carId: z.string().min(2).max(80),
    }),
    z.object({
      action: z.literal('wishlist_remove'),
      carId: z.string().min(2).max(80),
    }),
  ])
);

async function buyerAccount(request: NextRequest) {
  const session = getSession(request);
  if (!session) return null;
  if (session.role === 'buyer') {
    const buyer = await (await getDb()).collection<Record<string, unknown>>('buyers').findOne({ id: session.sub }, { projection: { id: 1, name: 1, email: 1, phone: 1, city: 1 } });
    return { session, buyer: buyer || { id: session.sub, name: session.name || 'Cars21 Member', email: session.email || '' } };
  }
  // Allow superadmin, admin or vendor sessions acting on frontend
  return { session, buyer: { id: session.sub, name: session.name || 'Cars21 Member', email: session.email || '' } };
}

export async function POST(request: NextRequest) {
  const auth = await buyerAccount(request).catch(() => null);
  const jsonBody = await request.json().catch(() => null);
  const parsed = schema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Activity could not be recorded.' }, { status: 400 });
  }

  const data = parsed.data;

  // Determine user identity: Google Account -> Lead Identity -> Visitor Guest
  const cleanPhone = (data.leadPhone || (auth?.buyer as any)?.phone || '').replace(/\D/g, '');
  const isGoogleUser = Boolean(auth?.session?.sub);
  const userId = isGoogleUser
    ? auth!.session.sub
    : data.leadUserId || (cleanPhone ? `lead_${cleanPhone}` : (data.visitorId || 'guest_visitor'));

  const clientName = isGoogleUser
    ? String(auth!.buyer.name || auth!.session.name || 'Cars21 Member')
    : String(data.leadName || (cleanPhone ? `Lead (${cleanPhone})` : 'Cars21 Visitor'));

  const clientEmail = isGoogleUser
    ? String(auth!.buyer.email || auth!.session.email || '')
    : cleanPhone ? `${cleanPhone}@lead.cars21.com` : 'Guest Session';

  const phone = cleanPhone || String((auth?.buyer as any)?.phone || '');
  const city = String(data.leadCity || (auth?.buyer as any)?.city || '');
  const isLeadSession = !isGoogleUser;

  try {
    const db = await getDb();
    const common = {
      userId,
      clientName,
      clientEmail,
      phone,
      city,
      isLeadSession,
      createdAt: new Date(),
    };

    let action: Record<string, unknown>;

    if (data.action === 'search') {
      action = { ...common, action: 'search', targetType: 'search', targetLabel: data.label.slice(0, 240) || 'All cars' };
    } else if (data.action === 'car_view') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
      if (!car) return NextResponse.json({ ok: true, tracked: false });
      const vendorId = String(car.vendorId ?? '');
      const vendor = vendorId ? await db.collection<Record<string, unknown>>('vendors').findOne({ id: vendorId, status: 'active' }, { projection: { name: 1, businessName: 1 } }) : null;
      const carLabel = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim();
      action = {
        ...common,
        action: 'car_view',
        targetType: 'car',
        carId: String(car.id),
        carLabel,
        vendorId: vendor ? vendorId : '',
        vendorName: vendor ? String(vendor.businessName || vendor.name || 'Dealer') : '',
        targetLabel: `Viewed Car: ${carLabel} · ${car.city || ''} (₹${(car.price || 0).toLocaleString('en-IN')})`
      };
    } else if (data.action === 'button_click') {
      const carId = data.carId;
      let carLabel = '';
      if (carId) {
        const car: any = await db.collection('cars').findOne({ id: carId });
        if (car) carLabel = `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim();
      }
      const label = data.details || (carLabel ? `${data.buttonName} on ${carLabel}` : data.buttonName);
      action = {
        ...common,
        action: 'button_click',
        buttonName: data.buttonName,
        targetType: data.targetType || (carId ? 'car' : 'general'),
        carId: carId || '',
        carLabel,
        targetLabel: label.slice(0, 240),
        details: data.details || ''
      };
    } else if (data.action === 'inspection_view') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId });
      const carLabel = car ? `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() : carId;
      action = {
        ...common,
        action: 'inspection_view',
        targetType: 'inspection',
        carId,
        carLabel,
        targetLabel: `Viewed 140-Point Diagnostic Report for ${carLabel}`.slice(0, 240),
        details: data.details || ''
      };
    } else if (data.action === 'report_download') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId });
      const carLabel = car ? `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() : carId;
      action = {
        ...common,
        action: 'report_download',
        targetType: 'inspection',
        carId,
        carLabel,
        targetLabel: `Downloaded Diagnostic Certificate for ${carLabel}`.slice(0, 240),
        details: data.details || ''
      };
    } else if (data.action === 'contact_dealer') {
      action = {
        ...common,
        action: 'contact_dealer',
        targetType: 'dealer',
        carId: data.carId || '',
        vendorSlug: data.vendorSlug || '',
        channel: data.channel || 'whatsapp',
        targetLabel: `Contacted Dealer via ${data.channel === 'call' ? 'Direct Call' : 'WhatsApp'}`,
      };
    } else if (data.action === 'reveal_phone') {
      action = {
        ...common,
        action: 'reveal_phone',
        targetType: data.carId ? 'car' : 'vendor',
        carId: data.carId || '',
        vendorSlug: data.vendorSlug || '',
        targetLabel: data.details || 'Revealed Dealer Contact Details',
      };
    } else if (data.action === 'buy_lead_captured') {
      action = {
        ...common,
        action: 'buy_lead_captured',
        targetType: 'lead',
        targetLabel: data.details || `Submitted Lead Form: ${clientName} (${phone}, ${city})`,
      };
    } else if (data.action === 'wishlist_add' || data.action === 'wishlist_remove') {
      const carId = data.carId;
      const car: any = await db.collection('cars').findOne({ id: carId });
      const carLabel = car ? `${car.year || ''} ${car.make || ''} ${car.model || ''}`.trim() : carId;
      action = {
        ...common,
        action: data.action,
        targetType: 'car',
        carId,
        carLabel,
        targetLabel: data.action === 'wishlist_add' ? `Added ${carLabel} to Saved Wishlist` : `Removed ${carLabel} from Wishlist`
      };
    } else if (data.action === 'test_drive') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
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
        phone: data.phone || phone,
        notes: data.notes || '',
      };
    } else if (data.action === 'express_interest') {
      const carId = data.carId;
      let car: any = await db.collection('cars').findOne({ id: carId, $or: [{ status: 'active' }, { status: { $exists: false } }] });
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
        phone: data.phone || phone,
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
      action = { ...common, action: 'vendor_view', targetType: 'vendor', vendorId: id, vendorName: name, targetLabel: `Opened Showroom: ${name}` };
    }

    const collection = db.collection('user_actions');
    await Promise.all([
      collection.createIndex({ userId: 1, createdAt: -1 }),
      collection.createIndex({ carId: 1, createdAt: -1 }),
      collection.createIndex({ vendorId: 1, createdAt: -1 })
    ]);
    await collection.insertOne(action);
    return NextResponse.json({ ok: true, tracked: true, action: parsed.data.action, targetLabel: action.targetLabel });
  } catch { 
    return NextResponse.json({ error: 'Activity history is temporarily unavailable.' }, { status: 503 }); 
  }
}
