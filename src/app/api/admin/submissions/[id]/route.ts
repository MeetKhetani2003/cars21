import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { isAdminRequest, isSuperAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ type: z.enum(['seller', 'dealer']), status: z.enum(['new', 'contacted', 'in_progress', 'closed']).optional(), verificationStatus: z.enum(['approved', 'rejected', 'pending']).optional() }).refine(value => Boolean(value.status || (value.type === 'seller' && value.verificationStatus)), 'Choose a valid update.');

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid submission update.' }, { status: 400 });
  try {
    const db = await getDb();
    const collection = db.collection<Record<string, unknown>>(parsed.data.type === 'seller' ? 'sellerLeads' : 'dealerApplications');
    const existing = await collection.findOne({ id }) ?? (ObjectId.isValid(id) ? await collection.findOne({ _id: new ObjectId(id) }) : null);
    if (!existing) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status) update.status = parsed.data.status;
    if (parsed.data.verificationStatus) update.verificationStatus = parsed.data.verificationStatus;
    const result = await collection.updateOne({ _id: existing._id }, { $set: update });
    if (!result.matchedCount && ObjectId.isValid(id)) {
      const fallback = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update });
      if (!fallback.matchedCount) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    } else if (!result.matchedCount) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    if (parsed.data.type === 'seller' && existing.userId && parsed.data.verificationStatus) {
      const userId = String(existing.userId);
      const anotherApproval = parsed.data.verificationStatus === 'approved'
        ? null
        : await collection.findOne({ userId, verificationStatus: 'approved', _id: { $ne: existing._id } }, { projection: { _id: 1 } });
      await db.collection('buyers').updateOne({ id: userId }, { $set: { sellerStatus: anotherApproval ? 'approved' : parsed.data.verificationStatus, sellerStatusUpdatedAt: new Date() } });
      if (parsed.data.verificationStatus === 'rejected' && !anotherApproval) await db.collection('cars').updateMany({ sellerUserId: userId, status: 'active' }, { $set: { status: 'paused', updatedAt: new Date() } });
    }
    return NextResponse.json({ ok: true, status: parsed.data.status, verificationStatus: parsed.data.verificationStatus });
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
