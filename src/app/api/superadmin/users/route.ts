import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, isSuperAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const accountSchema = z.discriminatedUnion('accountType', [
  z.object({ accountType: z.literal('admin'), name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(160) }),
  z.object({ accountType: z.literal('vendor'), name: z.string().trim().min(2).max(100), businessName: z.string().trim().min(2).max(120), email: z.string().trim().email().max(160), phone: z.string().trim().min(8).max(24), city: z.string().trim().min(2).max(80) }),
]);

export async function GET(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  try {
    const db = await getDb();
    const [admins, vendors] = await Promise.all([
      db.collection<Record<string, unknown>>('admins').find({}).sort({ createdAt: -1 }).limit(300).toArray(),
      db.collection<Record<string, unknown>>('vendors').find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    ]);
    return NextResponse.json({ accounts: [
      ...admins.map(item => ({ id: String(item.id ?? item._id), accountType: 'admin', name: item.name, email: item.email, status: item.status, createdAt: item.createdAt })),
      ...vendors.map(item => ({ id: String(item.id ?? item._id), accountType: 'vendor', name: item.name, businessName: item.businessName, email: item.email, phone: item.phone, city: item.city, status: item.status, createdAt: item.createdAt })),
    ] });
  } catch { return NextResponse.json({ error: 'Accounts are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required to create accounts.' }, { status: 403 });
  const parsed = accountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the account details and try again.' }, { status: 400 });
  const accountType = parsed.data.accountType;
  const email = parsed.data.email.toLowerCase();
  try {
    const db = await getDb();
    const admins = db.collection<Record<string, unknown>>('admins');
    const vendors = db.collection<Record<string, unknown>>('vendors');
    await Promise.all([admins.createIndex({ email: 1 }, { unique: true }), vendors.createIndex({ email: 1 }, { unique: true })]);
    if (await admins.findOne({ email }) || await vendors.findOne({ email })) return NextResponse.json({ error: 'An account already uses that email.' }, { status: 409 });
    const password = randomBytes(15).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    const id = randomBytes(12).toString('hex');
    const values = { ...parsed.data, email };
    const account = { id, ...values, role: accountType, status: 'active', passwordSalt: salt, passwordHash: hash, createdAt: new Date(), updatedAt: new Date() };
    await (accountType === 'admin' ? admins : vendors).insertOne(account);
    const { passwordSalt: _salt, passwordHash: _hash, ...safeAccount } = account;
    return NextResponse.json({ account: { ...safeAccount, createdAt: new Date().toISOString() }, initialPassword: password }, { status: 201 });
  } catch (reason) {
    if (reason && typeof reason === 'object' && 'code' in reason && reason.code === 11000) return NextResponse.json({ error: 'An account already uses that email.' }, { status: 409 });
    return NextResponse.json({ error: 'Account could not be created.' }, { status: 503 });
  }
}
