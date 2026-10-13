import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, isSuperAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const accountTypeSchema = z.object({ accountType: z.enum(['admin', 'vendor']), status: z.enum(['active', 'suspended']).optional(), name: z.string().trim().min(2).max(100).optional(), email: z.string().trim().email().max(160).optional(), businessName: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().min(8).max(24).optional(), city: z.string().trim().min(2).max(80).optional() });

export async function PATCH(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = accountTypeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select an account type.' }, { status: 400 });
  const { id } = await context.params;
  try {
    const db = await getDb();
    const collectionName = parsed.data.accountType === 'admin' ? 'admins' : 'vendors';
    const collection = db.collection<Record<string, unknown>>(collectionName);
    if (parsed.data.email) {
      const email = parsed.data.email.toLowerCase();
      const otherCollection = db.collection(collectionName === 'admins' ? 'vendors' : 'admins');
      if (await collection.findOne({ email, id: { $ne: id } }) || await otherCollection.findOne({ email })) return NextResponse.json({ error: 'Another account already uses that email.' }, { status: 409 });
    }
    const { accountType: _accountType, ...changes } = parsed.data;
    if (changes.email) changes.email = changes.email.toLowerCase();
    const result = await collection.updateOne({ id }, { $set: { ...changes, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Account could not be updated.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = accountTypeSchema.pick({ accountType: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select an account type.' }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await (await getDb()).collection(parsed.data.accountType === 'admin' ? 'admins' : 'vendors').deleteOne({ id });
    if (!result.deletedCount) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Account could not be deleted.' }, { status: 503 }); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = accountTypeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select an account type.' }, { status: 400 });
  const { id } = await context.params;
  try {
    const collection = (await getDb()).collection(parsed.data.accountType === 'admin' ? 'admins' : 'vendors');
    if (!await collection.findOne({ id })) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    const password = randomBytes(15).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    await collection.updateOne({ id }, { $set: { passwordSalt: salt, passwordHash: hash, updatedAt: new Date() } });
    return NextResponse.json({ initialPassword: password });
  } catch { return NextResponse.json({ error: 'Account password could not be reset.' }, { status: 503 }); }
}
