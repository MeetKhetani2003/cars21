import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ObjectId, Filter, Document } from 'mongodb';
import { hashPassword, isSuperAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';
import { vendorSlug } from '../../../../../lib/vendor-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

function buildIdFilter(id: string): Filter<Document> {
  const clauses: Filter<Document>[] = [{ id }];
  if (ObjectId.isValid(id)) {
    clauses.push({ _id: new ObjectId(id) });
  }
  return { $or: clauses };
}

const accountTypeSchema = z.object({
  accountType: z.enum(['admin', 'vendor']),
  status: z.enum(['active', 'suspended']).optional(),
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(160).optional(),
  businessName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(24).optional(),
  inquiryEmail: z.union([z.string().trim().email().max(160), z.literal('')]).optional(),
  inquiryWhatsApp: z.union([z.string().trim().min(8).max(24).regex(/^\+?[\d\s()-]+$/), z.literal('')]).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  area: z.string().trim().max(120).optional(),
  address: z.string().trim().max(240).optional(),
  description: z.string().trim().max(1200).optional(),
  website: z.union([z.string().trim().max(240).refine(value => !value || /^https?:\/\//i.test(value), 'Enter a website starting with https://.'), z.literal('')]).optional(),
  workingHours: z.string().trim().max(160).optional(),
  establishedYear: z.number().int().min(1900).max(2100).nullable().optional(),
  specialties: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  logoPhotoId: z.string().max(80).optional(),
  coverPhotoId: z.string().max(80).optional(),
  shopPhotoIds: z.array(z.string().max(80)).max(8).optional(),
  assignedAdminId: z.string().optional(),
  assignedAdminName: z.string().optional(),
  password: z.union([
    z.string().trim().min(6, 'Password must have at least 6 characters').max(100),
    z.literal('')
  ]).optional(),
});

export async function PATCH(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = accountTypeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid account details.' }, { status: 400 });
  const { id } = await context.params;
  try {
    const db = await getDb();
    const collectionName = parsed.data.accountType === 'admin' ? 'admins' : 'vendors';
    const collection = db.collection<Record<string, unknown>>(collectionName);
    const filter = buildIdFilter(id);
    if (parsed.data.email) {
      const email = parsed.data.email.toLowerCase();
      const otherCollection = db.collection(collectionName === 'admins' ? 'vendors' : 'admins');
      if (await collection.findOne({ email, id: { $ne: id } }) || await otherCollection.findOne({ email })) return NextResponse.json({ error: 'Another account already uses that email.' }, { status: 409 });
    }
    const { accountType: _accountType, password: newPassword, ...changes } = parsed.data;
    if (changes.email) changes.email = changes.email.toLowerCase();
    const updates: Record<string, unknown> = { ...changes, updatedAt: new Date() };
    if (newPassword && newPassword.trim().length >= 6) {
      const { salt, hash } = await hashPassword(newPassword.trim());
      updates.passwordSalt = salt;
      updates.passwordHash = hash;
    }
    if (parsed.data.accountType === 'vendor' && changes.businessName) updates.slug = vendorSlug(changes.businessName, id);
    if (parsed.data.accountType === 'vendor' && changes.assignedAdminId !== undefined) {
      let adminName = changes.assignedAdminName || '';
      if (changes.assignedAdminId) {
        const adminDoc = await db.collection('admins').findOne({ id: changes.assignedAdminId }, { projection: { name: 1 } });
        if (adminDoc?.name) adminName = String(adminDoc.name);
      }
      updates.assignedAdminId = changes.assignedAdminId || null;
      updates.assignedAdminName = adminName || null;
    }
    const result = await collection.updateOne(filter, { $set: updates });
    if (!result.matchedCount) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    const currentVendor = parsed.data.accountType === 'vendor' ? await collection.findOne(filter, { projection: { businessName: 1, name: 1 } }) : null;
    const vendorProfileUrl = currentVendor ? `/dealers/${vendorSlug(String(currentVendor.businessName ?? currentVendor.name ?? 'Dealer'), id)}` : undefined;
    return NextResponse.json({ ok: true, profileUrl: vendorProfileUrl });
  } catch { return NextResponse.json({ error: 'Account could not be updated.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = accountTypeSchema.pick({ accountType: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select an account type.' }, { status: 400 });
  const { id } = await context.params;
  try {
    const filter = buildIdFilter(id);
    const result = await (await getDb()).collection(parsed.data.accountType === 'admin' ? 'admins' : 'vendors').deleteOne(filter);
    if (!result.deletedCount) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Account could not be deleted.' }, { status: 503 }); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 });
  const parsed = accountTypeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Select an account type.' }, { status: 400 });
  const { id } = await context.params;
  try {
    const filter = buildIdFilter(id);
    const collection = (await getDb()).collection(parsed.data.accountType === 'admin' ? 'admins' : 'vendors');
    if (!await collection.findOne(filter)) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    const customPassword = parsed.data.password && parsed.data.password.trim().length >= 6 ? parsed.data.password.trim() : null;
    const password = customPassword || randomBytes(12).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    await collection.updateOne(filter, { $set: { passwordSalt: salt, passwordHash: hash, updatedAt: new Date() } });
    return NextResponse.json({ initialPassword: password });
  } catch { return NextResponse.json({ error: 'Account password could not be reset.' }, { status: 503 }); }
}
