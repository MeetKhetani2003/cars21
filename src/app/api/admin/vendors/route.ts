import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, isAdminRequest, isSuperAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const vendorSchema = z.object({ name: z.string().trim().min(2).max(100), businessName: z.string().trim().min(2).max(120), email: z.string().trim().email().max(160), phone: z.string().trim().min(8).max(24), city: z.string().trim().min(2).max(80) });

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    const vendors = await (await getDb()).collection<Record<string, unknown>>('vendors').find({}).sort({ createdAt: -1 }).limit(300).toArray();
    return NextResponse.json({ vendors: vendors.map(vendor => ({ id: String(vendor.id ?? vendor._id), name: vendor.name, businessName: vendor.businessName, email: vendor.email, phone: vendor.phone, city: vendor.city, status: vendor.status, createdAt: vendor.createdAt })) });
  } catch { return NextResponse.json({ error: 'Vendor accounts are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required to create vendor accounts.' }, { status: 403 });
  const parsed = vendorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the vendor details and try again.' }, { status: 400 });
  try {
    const collection = (await getDb()).collection<Record<string, unknown>>('vendors');
    await collection.createIndex({ email: 1 }, { unique: true });
    const email = parsed.data.email.toLowerCase();
    if (await collection.findOne({ email })) return NextResponse.json({ error: 'A vendor account already uses that email.' }, { status: 409 });
    const password = randomBytes(12).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    const id = randomBytes(12).toString('hex');
    await collection.insertOne({ id, ...parsed.data, email, role: 'vendor', status: 'active', passwordSalt: salt, passwordHash: hash, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ vendor: { id, ...parsed.data, email, status: 'active' }, initialPassword: password }, { status: 201 });
  } catch (reason) {
    if (reason && typeof reason === 'object' && 'code' in reason && reason.code === 11000) return NextResponse.json({ error: 'A vendor account already uses that email.' }, { status: 409 });
    return NextResponse.json({ error: 'Vendor account could not be created.' }, { status: 503 });
  }
}
