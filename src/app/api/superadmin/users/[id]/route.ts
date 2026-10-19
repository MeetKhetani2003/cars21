import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, isSuperAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';
import { vendorSlug } from '../../../../../lib/vendor-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const accountTypeSchema = z.object({ accountType: z.enum(['admin', 'vendor']), status: z.enum(['active', 'suspended']).optional(), name: z.string().trim().min(2).max(100).optional(), email: z.string().trim().email().max(160).optional(), businessName: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().min(8).max(24).optional(), inquiryEmail: z.string().trim().email().max(160).optional(), inquiryWhatsApp: z.string().trim().min(8).max(24).regex(/^\+?[\d\s()-]+$/).optional(), city: z.string().trim().min(2).max(80).optional(), area: z.string().trim().max(120).optional(), address: z.string().trim().max(240).optional(), description: z.string().trim().max(1200).optional(), website: z.string().trim().max(240).optional().refine(value => value === undefined || value === '' || /^https?:\/\//i.test(value), 'Enter a website starting with https://.'), workingHours: z.string().trim().max(160).optional(), establishedYear: z.number().int().min(1900).max(2100).nullable().optional(), specialties: z.array(z.string().trim().min(1).max(40)).max(12).optional(), logoPhotoId: z.string().max(80).optional(), coverPhotoId: z.string().max(80).optional(), shopPhotoIds: z.array(z.string().max(80)).max(8).optional() });

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
    const updates: Record<string, unknown> = { ...changes, updatedAt: new Date() };
    if (parsed.data.accountType === 'vendor' && changes.businessName) updates.slug = vendorSlug(changes.businessName, id);
    const result = await collection.updateOne({ id }, { $set: updates });
    if (!result.matchedCount) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    const currentVendor = parsed.data.accountType === 'vendor' ? await collection.findOne({ id }, { projection: { businessName: 1, name: 1 } }) : null;
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
