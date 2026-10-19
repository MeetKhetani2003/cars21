import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest, isSuperAdminRequest, isVendorSession } from '../../../server/auth';
import { getDb, getPhotoBucket } from '../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const maximumBytes = 4 * 1024 * 1024;
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function POST(request: NextRequest) {
  const admin = isAdminRequest(request);
  const vendor = isVendorSession(request);
  if (!admin && !vendor) return NextResponse.json({ error: 'Sign in to upload listing photos.' }, { status: 401 });
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maximumBytes + 64_000) return NextResponse.json({ error: 'Photos must be 4 MB or smaller.' }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: 'Send a multipart form with a file field.' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'A photo file is required.' }, { status: 400 });
  if (!acceptedTypes.has(file.type)) return NextResponse.json({ error: 'Use a JPEG, PNG, WebP, or AVIF image.' }, { status: 415 });
  if (file.size < 1 || file.size > maximumBytes) return NextResponse.json({ error: 'Photos must be 4 MB or smaller.' }, { status: 413 });
  try {
    const requestedVendorId = String(form.get('vendorId') || '').trim();
    if (requestedVendorId && !isSuperAdminRequest(request)) return NextResponse.json({ error: 'Only the superadmin can upload photos for another vendor.' }, { status: 403 });
    if (requestedVendorId && !await (await getDb()).collection('vendors').findOne({ id: requestedVendorId }, { projection: { _id: 1 } })) return NextResponse.json({ error: 'Vendor account not found.' }, { status: 404 });
    if (vendor && !await (await getDb()).collection('vendors').findOne({ id: vendor.vendorId, status: 'active' }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'This vendor account is suspended.' }, { status: 403 });
    }
    const bucket = await getPhotoBucket();
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'car-photo';
    const upload = bucket.openUploadStream(filename, { metadata: { contentType: file.type, originalName: filename, uploadedAt: new Date(), ...(vendor ? { vendorId: vendor.vendorId } : requestedVendorId ? { vendorId: requestedVendorId } : {}) } });
    const bytes = Buffer.from(await file.arrayBuffer());
    await new Promise<void>((resolve, reject) => {
      upload.once('error', reject);
      upload.once('finish', resolve);
      upload.end(bytes);
    });
    return NextResponse.json({ id: upload.id.toString(), url: `/api/photos/${upload.id.toString()}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Photo storage is temporarily unavailable.' }, { status: 503 });
  }
}


