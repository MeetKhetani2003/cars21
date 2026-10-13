import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { hashPassword, isAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ status: z.enum(['active', 'suspended']) });
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose an account status.' }, { status: 400 });
  try {
    const result = await (await getDb()).collection('vendors').updateOne({ id }, { $set: { status: parsed.data.status, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Vendor account not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch { return NextResponse.json({ error: 'Vendor account could not be updated.' }, { status: 503 }); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  try {
    const collection = (await getDb()).collection('vendors');
    if (!await collection.findOne({ id })) return NextResponse.json({ error: 'Vendor account not found.' }, { status: 404 });
    const password = randomBytes(12).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    await collection.updateOne({ id }, { $set: { passwordSalt: salt, passwordHash: hash, updatedAt: new Date() } });
    return NextResponse.json({ initialPassword: password });
  } catch { return NextResponse.json({ error: 'Vendor password could not be reset.' }, { status: 503 }); }
}
