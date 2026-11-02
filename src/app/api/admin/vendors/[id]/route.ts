import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { ObjectId, Filter, Document } from 'mongodb';
import { hashPassword, isAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ status: z.enum(['active', 'suspended']) });
type Context = { params: Promise<{ id: string }> };

function buildIdFilter(id: string): Filter<Document> {
  const clauses: Filter<Document>[] = [{ id }];
  if (ObjectId.isValid(id)) {
    clauses.push({ _id: new ObjectId(id) });
  }
  return { $or: clauses };
}

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose an account status.' }, { status: 400 });
  try {
    const filter = buildIdFilter(id);
    const result = await (await getDb()).collection('vendors').updateOne(filter, { $set: { status: parsed.data.status, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Vendor account not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch { return NextResponse.json({ error: 'Vendor account could not be updated.' }, { status: 503 }); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  const rawBody = await request.json().catch(() => null);
  try {
    const filter = buildIdFilter(id);
    const collection = (await getDb()).collection('vendors');
    if (!await collection.findOne(filter)) return NextResponse.json({ error: 'Vendor account not found.' }, { status: 404 });
    const customPassword = rawBody?.password && typeof rawBody.password === 'string' && rawBody.password.trim().length >= 6 ? rawBody.password.trim() : null;
    const password = customPassword || randomBytes(12).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    await collection.updateOne(filter, { $set: { passwordSalt: salt, passwordHash: hash, updatedAt: new Date() } });
    return NextResponse.json({ initialPassword: password });
  } catch { return NextResponse.json({ error: 'Vendor password could not be reset.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  try {
    const filter = buildIdFilter(id);
    const result = await (await getDb()).collection('vendors').deleteOne(filter);
    if (!result.deletedCount) return NextResponse.json({ error: 'Vendor account not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Vendor account could not be deleted.' }, { status: 503 }); }
}
