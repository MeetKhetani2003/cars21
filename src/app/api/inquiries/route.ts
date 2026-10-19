import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cars as demoCars } from '../../../data';
import { getSession, isAdminRequest, isVendorSession } from '../../../server/auth';
import { getDb } from '../../../server/mongodb';
import { getVendorEntitlements } from '../../../server/vendor-subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inquirySchema = z.object({
  carId: z.string().min(2).max(80),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{10,18}$/).refine(value => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 10 && digits <= 15;
  }),
  email: z.union([z.string().trim().email().max(160), z.literal('')]).optional().default(''),
  city: z.string().trim().min(2).max(80),
  message: z.string().trim().max(1000).optional().default(''),
  preferredDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).optional().default(''),
  preferredTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('')]).optional().default(''),
}).superRefine((value, context) => {
  if (value.preferredTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.preferredTime)) {
    context.addIssue({ code: 'custom', path: ['preferredTime'], message: 'Choose a valid time.' });
  }
  if (value.preferredDate) {
    const [year, month, day] = value.preferredDate.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) {
      context.addIssue({ code: 'custom', path: ['preferredDate'], message: 'Choose a valid date.' });
    }
    const indiaToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (value.preferredDate < indiaToday) context.addIssue({ code: 'custom', path: ['preferredDate'], message: 'Choose today or a future date.' });
  }
});

function normalizedWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return '';
}

function vehicleSnapshot(car: Record<string, unknown>, requestUrl: string) {
  const imageId = String(car.imageId ?? '');
  const imagePath = String(car.image ?? '');
  const imageUrl = imageId
    ? new URL(`/api/photos/${encodeURIComponent(imageId)}`, requestUrl).toString()
    : imagePath
      ? (/^https?:\/\//i.test(imagePath) ? imagePath : new URL(imagePath.startsWith('/') ? imagePath : `/${imagePath}`, requestUrl).toString())
      : '';
  return {
    id: String(car.id ?? car._id ?? ''),
    make: String(car.make ?? ''),
    model: String(car.model ?? ''),
    variant: String(car.variant ?? ''),
    year: Number(car.year ?? 0),
    km: Number(car.km ?? 0),
    fuel: String(car.fuel ?? ''),
    transmission: String(car.transmission ?? ''),
    owners: Number(car.owners ?? 1),
    price: Number(car.price ?? 0),
    city: String(car.city ?? ''),
    body: String(car.body ?? ''),
    color: String(car.color ?? ''),
    score: Number(car.score ?? 0),
    badge: String(car.badge ?? ''),
    image: imageUrl,
    sellerName: String(car.sellerName ?? ''),
    sellerPhone: String(car.sellerPhone ?? ''),
    sellerWhatsApp: String(car.sellerWhatsApp ?? ''),
    vendorId: String(car.vendorId ?? ''),
  };
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return NextResponse.json({ error: 'Sign in with Google before sending a car enquiry.' }, { status: 401 });
  const parsed = inquirySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the required contact details and try again.' }, { status: 400 });

  try {
    const db = await getDb();
    const buyer = await db.collection<Record<string, unknown>>('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } }, { projection: { name: 1, email: 1 } });
    if (!buyer) return NextResponse.json({ error: 'Sign in with Google before sending a car enquiry.' }, { status: 401 });
    let car = await db.collection('cars').findOne({ id: parsed.data.carId }) as Record<string, unknown> | null;
    if (!car && process.env.NODE_ENV !== 'production') {
      car = (demoCars.find(item => item.id === parsed.data.carId) as unknown as Record<string, unknown> | undefined) ?? null;
    }
    if (!car) return NextResponse.json({ error: 'This car is no longer available.' }, { status: 404 });

    const vehicle = vehicleSnapshot(car, request.url);
    const vendor = vehicle.vendorId ? await db.collection<Record<string, unknown>>('vendors').findOne({ id: vehicle.vendorId, status: 'active' }, { projection: { businessName: 1, email: 1, inquiryEmail: 1, phone: 1, inquiryWhatsApp: 1 } }) : null;
    if (vehicle.vendorId) {
      const entitlements = await getVendorEntitlements(vehicle.vendorId);
      if (entitlements.subscription && !entitlements.features.buyerInquiries) return NextResponse.json({ error: 'This dealer is not currently accepting online enquiries.' }, { status: 403 });
    }
    const detailUrl = new URL(`/car/${encodeURIComponent(vehicle.id)}`, request.url).toString();
    const client = { ...parsed.data, name: String(buyer.name || session.name), email: String(buyer.email || session.email || parsed.data.email || '') };
    const inquiry = {
      carId: vehicle.id,
      userId: session.sub,
      vehicle,
      client: { name: client.name, phone: client.phone, email: client.email, city: client.city, message: client.message, preferredDate: client.preferredDate, preferredTime: client.preferredTime },
      detailUrl,
      status: 'new',
      vendorId: vehicle.vendorId || undefined,
      vendorName: String(vendor?.businessName ?? ''),
      notifications: { email: { status: 'queued', updatedAt: new Date() } },
      createdAt: new Date(),
    };
    const result = await db.collection('inquiries').insertOne(inquiry);
    await db.collection('user_actions').insertOne({ userId: session.sub, clientName: client.name, clientEmail: client.email, action: 'inquiry', targetType: 'car', targetLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim(), carId: vehicle.id, carLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim(), vendorId: vehicle.vendorId || '', vendorName: '', createdAt: new Date() }).catch(() => null);

    const targetNumber = normalizedWhatsAppNumber(String(vendor?.inquiryWhatsApp || vendor?.phone || vehicle.sellerWhatsApp || vehicle.sellerPhone || process.env.WHATSAPP_ADMIN_NUMBER || ''));
    const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(vehicle.price);
    const message = [
      'CARS21 · NEW CAR ENQUIRY',
      '',
      'CAR DETAILS',
      `Car: ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}`.trim(),
      `Price: ${price}`,
      `Year: ${vehicle.year} · Driven: ${vehicle.km.toLocaleString('en-IN')} km`,
      `Fuel: ${vehicle.fuel} · Transmission: ${vehicle.transmission} · Owners: ${vehicle.owners}`,
      `Body: ${vehicle.body} · Colour: ${vehicle.color || 'Not provided'}`,
      `Listing: ${vehicle.badge || 'Cars21 vehicle'} · Inspection score: ${vehicle.score}/100`,
      `Photo: ${vehicle.image || 'Open the car details page for photos'}`,
      `Location: ${vehicle.city}`,
      `Seller: ${vehicle.sellerName || 'Cars21 seller'}`,
      `Seller phone: ${vehicle.sellerPhone || vehicle.sellerWhatsApp || targetNumber}`,
      `Car details page: ${detailUrl}`,
      '',
      'CLIENT DETAILS',
      `Name: ${client.name}`,
      `Phone: ${client.phone}`,
      `Email: ${client.email || 'Not provided'}`,
      `City: ${client.city}`,
      `Visit preference: ${client.preferredDate ? `${client.preferredDate}${client.preferredTime ? ` at ${client.preferredTime}` : ''}` : client.preferredTime ? `Flexible date at ${client.preferredTime}` : 'Callback / flexible'}`,
      `Message: ${client.message || 'Please contact me about this car.'}`,
    ].join('\n');
    const inquiryEmail = String(vendor?.inquiryEmail || vendor?.email || '');
    const apiKey = process.env.RESEND_API_KEY || '';
    let emailStatus: 'sent' | 'not_configured' | 'failed' = 'not_configured';
    if (apiKey && inquiryEmail) {
      try {
        const mail = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(8000),
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: process.env.CARS21_EMAIL_FROM || 'Cars21 enquiries <onboarding@resend.dev>', to: [inquiryEmail], subject: `New enquiry: ${vehicle.year} ${vehicle.make} ${vehicle.model}`, text: `A new enquiry has been saved in your Cars21 dashboard.\n\nVehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}\nPrice: ${price}\nLocation: ${vehicle.city}\nListing: ${detailUrl}\n\nBuyer: ${client.name}\nPhone: ${client.phone}\nEmail: ${client.email || 'Not provided'}\nCity: ${client.city}\nPreferred time: ${client.preferredDate || client.preferredTime ? `${client.preferredDate} ${client.preferredTime}` : 'Flexible'}\nMessage: ${client.message || 'Please contact me about this car.'}\n\nThis enquiry has already been saved in your vendor dashboard and Cars21 superadmin inbox.` }),
        });
        emailStatus = mail.ok ? 'sent' : 'failed';
      } catch { emailStatus = 'failed'; }
    }
    await db.collection('inquiries').updateOne({ _id: result.insertedId }, { $set: { 'notifications.email': { status: emailStatus, to: inquiryEmail, updatedAt: new Date() } } }).catch(() => null);
    const whatsappUrl = targetNumber ? `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}` : null;
    return NextResponse.json({ id: result.insertedId.toString(), saved: true, emailStatus, whatsappUrl });
  } catch {
    return NextResponse.json({ error: 'We could not save your enquiry right now. Please try again.' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const admin = isAdminRequest(request);
  const vendorSession = isVendorSession(request);
  if (!admin && !vendorSession) return NextResponse.json({ error: 'Sign in to view enquiries.' }, { status: 401 });
  try {
    const db = await getDb();
    if (vendorSession) {
      const active = await db.collection('vendors').findOne({ id: vendorSession.vendorId, status: 'active' }, { projection: { _id: 1 } });
      if (!active) return NextResponse.json({ error: 'This vendor account is suspended.' }, { status: 403 });
    }
    const filter = admin ? {} : { vendorId: vendorSession?.vendorId };
    const inquiries = await db.collection('inquiries').find(filter).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json({ inquiries: inquiries.map(item => ({ ...item, id: item._id.toString(), _id: undefined })) });
  } catch {
    return NextResponse.json({ error: 'Enquiries are temporarily unavailable.' }, { status: 503 });
  }
}
