import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { type Filter, type Sort } from 'mongodb';
import { z } from 'zod';
import { cars as demoCars, type Car } from '../../../data';
import { vendorSlug as makeVendorSlug } from '../../../lib/vendor-slug';
import { isAdminRequest, isVendorSession } from '../../../server/auth';
import { getDb, getPhotoBucket } from '../../../server/mongodb';
import { getVendorEntitlements } from '../../../server/vendor-subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const carSchema = z.object({
  id: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(80),
  variant: z.string().max(120).default(''),
  year: z.number().int().min(1980).max(2100),
  km: z.number().int().min(0).max(2_000_000),
  fuel: z.string().min(1).max(30),
  transmission: z.string().min(1).max(30),
  owners: z.number().int().min(1).max(10),
  price: z.number().min(1).max(1_000_000_000),
  city: z.string().min(1).max(60),
  area: z.string().max(80).default(''),
  body: z.string().min(1).max(40),
  score: z.number().min(0).max(100).default(0),
  badge: z.string().max(60).default('Cars21 listing'),
  image: z.string().max(1000).optional(),
  imageId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  photoIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(20).default([]),
  inspection: z.object({ exterior: z.string().max(500), interior: z.string().max(500), engine: z.string().max(500), tyres: z.string().max(500), electronics: z.string().max(500), documents: z.string().max(500), roadTest: z.string().max(500), accidentHistory: z.string().max(500), notes: z.string().max(2000), evidencePhotoIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(20).default([]) }).optional(),
  sellerName: z.string().max(100).optional(),
  sellerPhone: z.string().max(24).optional(),
  sellerWhatsApp: z.string().max(24).optional(),
  accent: z.string().max(40).default('photo-one'),
  color: z.string().max(40).default(''),
  vendorId: z.string().max(100).optional(),
  status: z.enum(['active', 'pending', 'paused', 'sold']).default('active'),
});

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function mapCar(document: Record<string, unknown>): Car {
  const id = String(document.id ?? document._id ?? '');
  const imageId = document.imageId ? String(document.imageId) : '';
  return {
    id,
    make: String(document.make ?? ''),
    model: String(document.model ?? ''),
    variant: String(document.variant ?? ''),
    year: Number(document.year ?? 0),
    km: Number(document.km ?? 0),
    fuel: String(document.fuel ?? ''),
    transmission: String(document.transmission ?? ''),
    owners: Number(document.owners ?? 1),
    price: Number(document.price ?? 0),
    city: String(document.city ?? ''),
    area: String(document.area ?? document.locality ?? document.locationArea ?? ''),
    body: String(document.body ?? ''),
    score: Number(document.score ?? 0),
    inspectionReviewStatus: String(document.inspectionReviewStatus ?? ''),
    ...(document.inspectionReviewStatus === 'approved' && document.inspection && typeof document.inspection === 'object' ? { inspection: document.inspection as Record<string, unknown> } : {}),
    badge: String(document.badge ?? 'Cars21 listing'),
    image: imageId ? `/api/photos/${encodeURIComponent(imageId)}` : String(document.image ?? '/images/kars21-hero.png'),
    photos: Array.isArray(document.photoIds) ? document.photoIds.filter((photoId): photoId is string => typeof photoId === 'string').map(photoId => `/api/photos/${encodeURIComponent(photoId)}`) : [],
    accent: String(document.accent ?? 'photo-one'),
    color: String(document.color ?? ''),
    sellerName: String(document.sellerName ?? ''),
    sellerPhone: '',
    sellerWhatsApp: '',
    vendorId: String(document.vendorId ?? ''),
  };
}

async function attachVendorProfiles(db: Awaited<ReturnType<typeof getDb>>, documents: Record<string, unknown>[]) {
  const ids = [...new Set(documents.map(car => String(car.vendorId ?? '')).filter(Boolean))];
  const vendorDocs = ids.length ? await db.collection<Record<string, unknown>>('vendors').find({ id: { $in: ids }, status: 'active' })
    .project({ id: 1, name: 1, businessName: 1 }).toArray() : [];
  const vendors = new Map(vendorDocs.map(vendor => {
    const id = String(vendor.id ?? ''); const name = String(vendor.businessName ?? vendor.name ?? 'Dealer');
    return [id, { name, slug: makeVendorSlug(name, id) }];
  }));
  return documents.map(document => {
    const car = mapCar(document); const vendor = vendors.get(car.vendorId || '');
    return vendor ? { ...car, vendorName: vendor.name, vendorSlug: vendor.slug } : car;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().slice(0, 80) ?? '';
  const make = searchParams.get('make')?.trim().slice(0, 60) ?? '';
  const model = searchParams.get('model')?.trim().slice(0, 80) ?? '';
  const city = searchParams.get('city')?.trim().slice(0, 60) ?? '';
  const fuel = searchParams.get('fuel')?.trim().slice(0, 30) ?? '';
  const body = searchParams.get('body')?.trim().slice(0, 40) ?? '';
  const transmission = searchParams.get('transmission')?.trim().slice(0, 30) ?? '';
  const minPrice = Number(searchParams.get('minPrice') || 0);
  const maxPrice = Number(searchParams.get('maxPrice') || 0);
  const sortKey = searchParams.get('sort') || 'recommended';
  const sort: Sort = sortKey === 'price-asc' ? { price: 1 } : sortKey === 'price-desc' ? { price: -1 } : sortKey === 'newest' ? { year: -1, price: -1 } : { priorityPlacement: -1, score: -1, year: -1 };
  const conditions: Filter<Record<string, unknown>>[] = [{ $or: [{ status: 'active' }, { status: { $exists: false } }] }];
  if (q) {
    const term = { $regex: escapeRegex(q), $options: 'i' };
    conditions.push({ $or: [{ make: term }, { model: term }, { variant: term }, { city: term }] });
  }
  if (make) conditions.push({ make: { $regex: escapeRegex(make), $options: 'i' } });
  if (model) conditions.push({ model: { $regex: `^${escapeRegex(model)}$`, $options: 'i' } });
  if (city) conditions.push({ city: { $regex: escapeRegex(city), $options: 'i' } });
  if (fuel) conditions.push({ fuel: { $regex: `^${escapeRegex(fuel)}$`, $options: 'i' } });
  if (transmission) conditions.push({ transmission: { $regex: `^${escapeRegex(transmission)}$`, $options: 'i' } });
  if (body === 'Automatic') conditions.push({ transmission: { $regex: '^automatic$', $options: 'i' } });
  else if (body === 'Electric') conditions.push({ $or: [{ body: { $regex: '^electric$', $options: 'i' } }, { fuel: { $regex: '^electric$', $options: 'i' } }] });
  else if (body === 'Luxury') conditions.push({ price: { $gt: 1_500_000 } });
  else if (body) conditions.push({ body: { $regex: `^${escapeRegex(body)}$`, $options: 'i' } });
  if (minPrice > 0 || maxPrice > 0) conditions.push({ price: { ...(minPrice > 0 ? { $gte: minPrice } : {}), ...(maxPrice > 0 ? { $lte: maxPrice } : {}) } });
  const filter: Filter<Record<string, unknown>> = conditions.length ? { $and: conditions } : {};

  try {
    const db = await getDb();
    const collection = db.collection<Record<string, unknown>>('cars');
    const documents = await collection.find(filter).sort(sort).limit(100).toArray();
    const cars = await attachVendorProfiles(db, documents);
    if (cars.length || process.env.NODE_ENV === 'production') return NextResponse.json({ cars, count: cars.length, source: 'mongodb' });
  } catch {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Inventory is temporarily unavailable.' }, { status: 503 });
  }

  const term = q.toLowerCase();
  let fallback = demoCars.filter(car => !term || `${car.make} ${car.model} ${car.variant} ${car.city}`.toLowerCase().includes(term));
  if (make) fallback = fallback.filter(car => car.make.toLowerCase().includes(make.toLowerCase()));
  if (model) fallback = fallback.filter(car => car.model.toLowerCase() === model.toLowerCase());
  if (city) fallback = fallback.filter(car => car.city.toLowerCase().includes(city.toLowerCase()));
  if (fuel) fallback = fallback.filter(car => car.fuel.toLowerCase() === fuel.toLowerCase());
  if (transmission) fallback = fallback.filter(car => car.transmission.toLowerCase() === transmission.toLowerCase());
  if (body === 'Automatic') fallback = fallback.filter(car => car.transmission === 'Automatic');
  else if (body === 'Electric') fallback = fallback.filter(car => car.body === 'Electric' || car.fuel === 'Electric');
  else if (body === 'Luxury') fallback = fallback.filter(car => car.price > 1_500_000);
  else if (body) fallback = fallback.filter(car => car.body.toLowerCase() === body.toLowerCase());
  if (minPrice > 0) fallback = fallback.filter(car => car.price >= minPrice);
  if (maxPrice > 0) fallback = fallback.filter(car => car.price <= maxPrice);
  if (sortKey === 'price-asc') fallback.sort((a,b)=>a.price-b.price);
  if (sortKey === 'price-desc') fallback.sort((a,b)=>b.price-a.price);
  if (sortKey === 'newest') fallback.sort((a,b)=>b.year-a.year);
  return NextResponse.json({ cars: fallback, count: fallback.length, source: 'demo' });
}

export async function POST(request: NextRequest) {
  const admin = isAdminRequest(request);
  const vendor = isVendorSession(request);
  if (!admin && !vendor) return NextResponse.json({ error: 'Sign in to manage listings.' }, { status: 401 });
  const parsed = carSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid car data.', details: parsed.error.flatten() }, { status: 400 });
  try {
    const db = await getDb();
    if (vendor) {
      const activeVendor = await db.collection('vendors').findOne({ id: vendor.vendorId, status: 'active' }, { projection: { _id: 1 } });
      if (!activeVendor) return NextResponse.json({ error: 'This vendor account is suspended.' }, { status: 403 });
      const entitlements = await getVendorEntitlements(vendor.vendorId!);
      if (!entitlements.subscription) return NextResponse.json({ error: 'Your dealer subscription is inactive. Ask Cars21 to assign a plan before adding or updating listings.' }, { status: 403 });
      const existingVendorCar = await db.collection('cars').findOne({ id: parsed.data.id, vendorId: vendor.vendorId }, { projection: { _id: 1 } });
      if (!existingVendorCar) {
        const activeCount = await db.collection('cars').countDocuments({ vendorId: vendor.vendorId, status: { $in: ['active', 'pending'] } });
        if (activeCount >= entitlements.maxListings) return NextResponse.json({ error: `Your plan allows up to ${entitlements.maxListings} active listings. Contact Cars21 to change plans.` }, { status: 403 });
      }
      const allImageIds = new Set([...parsed.data.photoIds, ...(parsed.data.imageId ? [parsed.data.imageId] : []), ...(parsed.data.inspection?.evidencePhotoIds ?? [])]);
      if (allImageIds.size > entitlements.maxImagesPerListing) return NextResponse.json({ error: `Your plan allows up to ${entitlements.maxImagesPerListing} images per listing, including inspection evidence.` }, { status: 400 });
      if (parsed.data.inspection && !entitlements.features.inspectionUploads) return NextResponse.json({ error: 'Inspection uploads are not included in your subscription plan.' }, { status: 403 });
    }
    const collection = db.collection('cars');
    const existing = await collection.findOne({ id: parsed.data.id });
    if (vendor && existing && existing.vendorId !== vendor.vendorId) return NextResponse.json({ error: 'You can only edit your own listings.' }, { status: 403 });
    if (parsed.data.vendorId && !admin) return NextResponse.json({ error: 'Vendor assignment is managed by Cars21.' }, { status: 403 });
    if (parsed.data.vendorId && !await db.collection('vendors').findOne({ id: parsed.data.vendorId })) return NextResponse.json({ error: 'Choose an existing vendor account.' }, { status: 400 });
    if (parsed.data.imageId) {
      const imageId = parsed.data.imageId;
      const photo = await getPhotoBucket().then(bucket => bucket.find({ _id: new ObjectId(String(imageId)) }).limit(1).toArray());
      if (!photo.length) return NextResponse.json({ error: 'The selected photo could not be found.' }, { status: 400 });
      if (vendor && photo[0].metadata?.vendorId !== vendor.vendorId) return NextResponse.json({ error: 'You can only use photos uploaded in your workspace.' }, { status: 403 });
    }
    if (vendor) {
      const photoIds = [...new Set([...parsed.data.photoIds, ...(parsed.data.imageId ? [parsed.data.imageId] : []), ...(parsed.data.inspection?.evidencePhotoIds ?? [])])];
      if (photoIds.length) {
        const photos = await getPhotoBucket().then(bucket => bucket.find({ _id: { $in: photoIds.map(id => new ObjectId(String(id))) } }).toArray());
        if (photos.length !== photoIds.length || photos.some(photo => photo.metadata?.vendorId !== vendor.vendorId)) return NextResponse.json({ error: 'One or more listing photos do not belong to your workspace.' }, { status: 403 });
      }
    }
    const data = vendor ? { ...parsed.data, vendorId: vendor.vendorId, status: 'active' as const, priorityPlacement: (await getVendorEntitlements(vendor.vendorId!)).features.priorityPlacement, inspectionReviewStatus: 'pending', inspectionReviewNote: '', photoIds: [...new Set([...parsed.data.photoIds, ...(parsed.data.imageId ? [parsed.data.imageId] : [])])], inspection: parsed.data.inspection ?? null, submittedForInspectionAt: new Date() } : parsed.data;
    const result = await collection.updateOne({ id: parsed.data.id }, { $set: { ...data, updatedAt: new Date() } }, { upsert: true });
    return NextResponse.json({ id: parsed.data.id, created: result.upsertedCount > 0 }, { status: result.upsertedCount ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: 'Inventory is temporarily unavailable.' }, { status: 503 });
  }
}

