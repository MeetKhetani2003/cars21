import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, hashPassword, isAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';
import { vendorSlug } from '../../../../lib/vendor-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const vendorSchema = z.object({
  name: z.string().trim().min(2, 'Name must have at least 2 characters').max(100),
  businessName: z.string().trim().min(2, 'Dealership name must have at least 2 characters').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().min(5, 'Phone number must have at least 5 characters').max(24),
  city: z.string().trim().min(2, 'City is required').max(80),
  assignedAdminId: z.string().trim().optional(),
  assignedAdminName: z.string().trim().optional(),
  password: z.union([
    z.string().trim().min(6, 'Password must have at least 6 characters').max(100),
    z.literal('')
  ]).optional(),
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    const session = getSession(request);
    const db = await getDb();
    let query: Record<string, unknown> = {};

    // Admin role can only see vendors assigned to them or added by them
    if (session?.role === 'admin') {
      query = {
        $or: [
          { assignedAdminId: session.sub },
          { 'addedBy.id': session.sub }
        ]
      };
    }

    const vendors = await db.collection<Record<string, unknown>>('vendors').find(query).sort({ createdAt: -1 }).limit(300).toArray();
    return NextResponse.json({
      vendors: vendors.map(vendor => {
        const id = String(vendor.id ?? vendor._id);
        const businessName = String(vendor.businessName ?? vendor.name ?? 'Dealer');
        return {
          id,
          name: vendor.name,
          businessName,
          email: vendor.email,
          phone: vendor.phone,
          city: vendor.city,
          status: vendor.status,
          createdAt: vendor.createdAt,
          profileUrl: `/dealers/${vendorSlug(businessName, id)}`,
          addedBy: vendor.addedBy || null,
          assignedAdminId: vendor.assignedAdminId || null,
          assignedAdminName: vendor.assignedAdminName || null,
        };
      })
    });
  } catch { return NextResponse.json({ error: 'Vendor accounts are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required to create vendor accounts.' }, { status: 403 });
  const rawBody = await request.json().catch(() => null);
  const parsed = vendorSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Check the vendor details and try again.';
    return NextResponse.json({ error: message, issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const session = getSession(request);
    const collection = (await getDb()).collection<Record<string, unknown>>('vendors');
    await collection.createIndex({ email: 1 }, { unique: true });
    const email = parsed.data.email.toLowerCase();
    if (await collection.findOne({ email })) return NextResponse.json({ error: 'A vendor account already uses that email.' }, { status: 409 });
    const customPassword = parsed.data.password && parsed.data.password.trim().length >= 6 ? parsed.data.password.trim() : null;
    const password = customPassword || randomBytes(12).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    const id = randomBytes(12).toString('hex');
    const slug = vendorSlug(parsed.data.businessName, id);
    const { password: _pw, ...cleanData } = parsed.data;

    const addedBy = {
      id: session?.sub || 'system',
      name: session?.name || (session?.role === 'superadmin' ? 'Super Admin' : 'Admin'),
      email: session?.email || '',
      role: session?.role || 'admin',
    };
    const assignedAdminId = session?.role === 'admin' ? session.sub : (parsed.data.assignedAdminId || '');
    const assignedAdminName = session?.role === 'admin' ? session.name : (parsed.data.assignedAdminName || '');

    const newVendorDoc = {
      id,
      ...cleanData,
      slug,
      email,
      role: 'vendor',
      status: 'active',
      passwordSalt: salt,
      passwordHash: hash,
      addedBy,
      assignedAdminId,
      assignedAdminName,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await collection.insertOne(newVendorDoc);
    return NextResponse.json({
      vendor: {
        id,
        ...cleanData,
        email,
        status: 'active',
        profileUrl: `/dealers/${slug}`,
        addedBy,
        assignedAdminId,
        assignedAdminName
      },
      initialPassword: password
    }, { status: 201 });
  } catch (reason) {
    if (reason && typeof reason === 'object' && 'code' in reason && reason.code === 11000) return NextResponse.json({ error: 'A vendor account already uses that email.' }, { status: 409 });
    return NextResponse.json({ error: 'Vendor account could not be created.' }, { status: 503 });
  }
}
