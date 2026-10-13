import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { isAdminRequest, isSuperAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ type: z.enum(['seller', 'dealer']), status: z.enum(['new', 'contacted', 'in_progress', 'closed']) });

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid submission status.' }, { status: 400 });
  try {
    const result = await (await getDb()).collection(parsed.data.type === 'seller' ? 'sellerLeads' : 'dealerApplications').updateOne({ id }, { $set: { status: parsed.data.status, updatedAt: new Date() } });
    if (!result.matchedCount && ObjectId.isValid(id)) {
      const fallback = await (await getDb()).collection(parsed.data.type === 'seller' ? 'sellerLeads' : 'dealerApplications').updateOne({ _id: new ObjectId(id) }, { $set: { status: parsed.data.status, updatedAt: new Date() } });
      if (!fallback.matchedCount) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    } else if (!result.matchedCount) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch { return NextResponse.json({ error: 'Submission could not be updated.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required to delete submissions.' }, { status: 403 });
  const { id } = await context.params;
  const parsed = z.object({ type: z.enum(['seller', 'dealer']) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a submission type.' }, { status: 400 });
  try {
    const collection = (await getDb()).collection(parsed.data.type === 'seller' ? 'sellerLeads' : 'dealerApplications');
    const result = await collection.deleteOne({ id });
    const fallback = result.deletedCount || !ObjectId.isValid(id) ? null : await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount && !fallback?.deletedCount) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Submission could not be deleted.' }, { status: 503 }); }
}
