import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getDb, getPhotoBucket } from './mongodb';

const demoVendorName = 'Cars21 TEST Mumbai Motors';
let pendingSeed: Promise<void> | null = null;

async function uploadDemoPhoto(vendorId: string, filename: string) {
  const bytes = await readFile(join(process.cwd(), 'public', 'images', filename));
  const bucket = await getPhotoBucket();
  const upload = bucket.openUploadStream(filename, { metadata: { contentType: 'image/webp', originalName: filename, uploadedAt: new Date(), vendorId, demoAsset: true } });
  await new Promise<void>((resolve, reject) => {
    upload.once('error', reject);
    upload.once('finish', resolve);
    upload.end(bytes);
  });
  return upload.id.toString();
}

async function seedDemoVendor(vendorId?: string) {
  if (process.env.NODE_ENV === 'production') return;
  const vendors = (await getDb()).collection<Record<string, unknown>>('vendors');
  const vendor = vendorId
    ? await vendors.findOne({ id: vendorId })
    : await vendors.findOne({ businessName: { $regex: '^Cars21 TEST Mumbai Motors$', $options: 'i' } });
  if (!vendor || String(vendor.businessName || '').trim().toLowerCase() !== demoVendorName.toLowerCase()) return;
  if (vendor.demoProfileSeed === 'mumbai-showroom-v1') return;

  const updates: Record<string, unknown> = {};
  const setIfBlank = (key: string, value: unknown) => {
    const current = vendor[key];
    if (current == null || current === '' || (Array.isArray(current) && current.length === 0)) updates[key] = value;
  };
  setIfBlank('area', 'Andheri East');
  setIfBlank('address', 'Demo showroom · Andheri East, Mumbai, Maharashtra 400069');
  setIfBlank('description', 'Welcome to the Cars21 demo showroom in Mumbai. Browse our sample pre-owned inventory, compare clear vehicle details, and contact our team to plan your next drive. This profile uses sample business information for product demonstration.');
  setIfBlank('workingHours', 'Monday–Saturday · 10:00 AM–7:00 PM');
  setIfBlank('establishedYear', 2016);
  setIfBlank('specialties', ['Pre-owned SUVs', 'Verified sedans', 'City cars']);

  if (!vendor.coverPhotoId) updates.coverPhotoId = await uploadDemoPhoto(String(vendor.id), 'demo-mumbai-showroom.webp');
  if (!Array.isArray(vendor.shopPhotoIds) || vendor.shopPhotoIds.length === 0) {
    updates.shopPhotoIds = [
      await uploadDemoPhoto(String(vendor.id), 'demo-mumbai-interior.webp'),
      await uploadDemoPhoto(String(vendor.id), 'demo-mumbai-lounge.webp'),
    ];
  }
  await vendors.updateOne({ id: vendor.id }, { $set: { ...updates, demoProfileSeed: 'mumbai-showroom-v1', updatedAt: new Date() } });
}

/** Populate only the named development demo account, without touching real vendor records. */
export async function ensureDevelopmentDemoVendorProfile(vendorId?: string) {
  if (process.env.NODE_ENV === 'production') return;
  pendingSeed ??= seedDemoVendor(vendorId).catch(() => undefined).finally(() => { pendingSeed = null; });
  await pendingSeed;
}
