import 'server-only';
import { getDb } from './mongodb';
import { vendorSlug } from '../lib/vendor-slug';
import { ensureDevelopmentDemoVendorProfile } from './demo-vendor';
import { getVendorEntitlements } from './vendor-subscription';

const visibleCar = { $or: [{ status: 'active' }, { status: { $exists: false } }] };
type VendorDoc = Record<string, unknown>;

function safeCar(car: VendorDoc) {
  const imageId = String(car.imageId ?? '');
  return {
    id: String(car.id ?? car._id ?? ''), make: String(car.make ?? ''), model: String(car.model ?? ''),
    variant: String(car.variant ?? ''), year: Number(car.year ?? 0), km: Number(car.km ?? 0),
    fuel: String(car.fuel ?? ''), transmission: String(car.transmission ?? ''), owners: Number(car.owners ?? 1),
    price: Number(car.price ?? 0), city: String(car.city ?? ''), area: String(car.area ?? car.locality ?? car.locationArea ?? ''), body: String(car.body ?? ''),
    score: Number(car.score ?? 0), badge: String(car.badge ?? 'Cars21 listing'),
    image: imageId ? `/api/photos/${encodeURIComponent(imageId)}` : String(car.image ?? '/images/kars21-hero.png'),
    accent: String(car.accent ?? 'photo-one'), color: String(car.color ?? ''), vendorId: String(car.vendorId ?? ''),
  };
}

function publicVendor(vendor: VendorDoc) {
  const id = String(vendor.id ?? vendor._id ?? '');
  const businessName = String(vendor.businessName ?? vendor.name ?? 'Local car dealer');
  const photoUrl = (value: unknown) => value ? `/api/photos/${encodeURIComponent(String(value))}` : '';
  return {
    id, slug: vendorSlug(businessName, id), name: String(vendor.name ?? businessName), businessName,
    city: String(vendor.city ?? ''), area: String(vendor.area ?? vendor.locality ?? ''),
    address: String(vendor.address ?? ''), description: String(vendor.description ?? ''), website: String(vendor.website ?? ''),
    workingHours: String(vendor.workingHours ?? ''), establishedYear: Number(vendor.establishedYear ?? 0) || null,
    specialties: Array.isArray(vendor.specialties) ? vendor.specialties.filter((item): item is string => typeof item === 'string') : [],
    logo: photoUrl(vendor.logoPhotoId), coverImage: photoUrl(vendor.coverPhotoId),
    shopPhotos: Array.isArray(vendor.shopPhotoIds) ? vendor.shopPhotoIds.filter(Boolean).map(photoUrl) : [],
    createdAt: vendor.createdAt ? new Date(String(vendor.createdAt)).toISOString() : '',
  };
}

export async function getPublicVendorProfile(slug: string) {
  await ensureDevelopmentDemoVendorProfile();
  const db = await getDb();
  const vendors = db.collection<VendorDoc>('vendors');
  const profileFields = { id: 1, name: 1, businessName: 1, city: 1, area: 1, locality: 1, address: 1, description: 1, website: 1, workingHours: 1, establishedYear: 1, specialties: 1, logoPhotoId: 1, coverPhotoId: 1, shopPhotoIds: 1, status: 1, createdAt: 1 };
  const doc = await vendors.findOne({ status: 'active', slug }, { projection: profileFields })
    ?? (await vendors.find({ status: 'active' }).project(profileFields).limit(2000).toArray())
      .find(item => vendorSlug(String(item.businessName ?? item.name ?? ''), String(item.id ?? item._id)) === slug);
  if (!doc) return null;
  const vendor = publicVendor(doc);
  const entitlements = await getVendorEntitlements(vendor.id);
  if (!entitlements.features.publicBusinessProfile) return null;
  const cars = await db.collection<VendorDoc>('cars').find({ vendorId: vendor.id, ...visibleCar })
    .sort({ updatedAt: -1, year: -1 }).limit(300).toArray();
  return { vendor, cars: cars.map(safeCar) };
}

export async function getPublicVendorDirectory() {
  const db = await getDb();
  const [vendorDocs, stock] = await Promise.all([
    db.collection<VendorDoc>('vendors').find({ status: 'active' })
      .project({ id: 1, name: 1, businessName: 1, city: 1, area: 1, locality: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(1000).toArray(),
    db.collection<VendorDoc>('cars').aggregate([
      { $match: { ...visibleCar, vendorId: { $exists: true, $ne: '' } } },
      { $group: { _id: '$vendorId', count: { $sum: 1 }, cities: { $addToSet: '$city' }, areas: { $addToSet: { $ifNull: ['$area', { $ifNull: ['$locality', '$locationArea'] }] } }, models: { $addToSet: { $concat: [{ $ifNull: ['$make', ''] }, ' ', { $ifNull: ['$model', ''] }] } } } },
    ]).toArray(),
  ]);
  const counts = new Map(stock.filter(item => item._id).map(item => [String(item._id), { count: Number(item.count ?? 0), cities: (Array.isArray(item.cities) ? item.cities : []).filter((value): value is string => typeof value === 'string' && value.trim().length > 0), areas: (Array.isArray(item.areas) ? item.areas : []).filter((value): value is string => typeof value === 'string' && value.trim().length > 0), models: (Array.isArray(item.models) ? item.models : []).filter((value): value is string => typeof value === 'string' && value.trim().length > 0) }]));
  const assignments = await db.collection<Record<string, unknown>>('vendor_subscriptions').find({ status: 'active', endAt: { $gt: new Date() } }).toArray();
  const planIds = [...new Set(assignments.map(item => String(item.planId ?? '')).filter(Boolean))];
  const plans = planIds.length ? await db.collection<Record<string, unknown>>('subscription_plans').find({ id: { $in: planIds } }).project({ id: 1, features: 1 }).toArray() : [];
  const planMap = new Map(plans.map(plan => [String(plan.id), plan.features as Record<string, unknown> | undefined]));
  const hidden = new Set(assignments.filter(item => planMap.get(String(item.planId))?.publicBusinessProfile === false).map(item => String(item.vendorId)));
  return vendorDocs.map(doc => { const id = String(doc.id ?? doc._id); const inventory = counts.get(id); return { ...publicVendor(doc), listingCount: inventory?.count ?? 0, cities: inventory?.cities ?? [], areas: [...new Set([String(doc.area ?? doc.locality ?? ''), ...(inventory?.areas ?? [])].filter(Boolean))], models: inventory?.models ?? [] }; })
    .filter(vendor => vendor.listingCount > 0 && !hidden.has(vendor.id));
}
