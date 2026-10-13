import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { isAdminRequest, isSuperAdminRequest, isVendorSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(['new', 'contacted', 'visit_booked', 'closed']) });

export async function PATCH(request: NextRequest, context: Context) {
  const admin = isAdminRequest(request);
  const vendorSession = isVendorSession(request);
  if (!admin && !vendorSession) return NextResponse.json({ error: 'Sign in to update enquiries.' }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid enquiry status.' }, { status: 400 });
  try {
    const db = await getDb();
    if (vendorSession && !await db.collection('vendors').findOne({ id: vendorSession.vendorId, status: 'active' }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'This vendor account is suspended.' }, { status: 403 });
    }
    const filter = admin ? { _id: new ObjectId(id) } : { _id: new ObjectId(id), vendorId: vendorSession?.vendorId };
    const result = await db.collection('inquiries').updateOne(filter, { $set: { status: parsed.data.status, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Enquiry not found in your workspace.' }, { status: 404 });
    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch { return NextResponse.json({ error: 'Enquiry could not be updated.' }, { status: 503 }); }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) return NextResponse.json({ error: 'Superadmin access required to delete enquiries.' }, { status: 403 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
  try {
    const result = await (await getDb()).collection('inquiries').deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Enquiry could not be deleted.' }, { status: 503 }); }
}
