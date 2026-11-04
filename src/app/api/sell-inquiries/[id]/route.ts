import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/mongodb';
import { getSession } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// GET a single sell inquiry
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = getSession(request);
    if (!session || (session.role !== 'superadmin' && session.role !== 'admin' && session.role !== 'vendor')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const db = await getDb();
    const doc = await db.collection('sellInquiries').findOne({ id });

    if (!doc) {
      return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
    }

    const { _id, ...rest } = doc;
    return NextResponse.json({ inquiry: { ...rest, id: rest.id || _id.toString() } });
  } catch (err) {
    console.error('Failed to get inquiry:', err);
    return NextResponse.json({ error: 'Failed to retrieve inquiry.' }, { status: 500 });
  }
}

// PATCH: Update status, document verification, admin notes, or counter offer
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = getSession(request);
    if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const updateFields: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (body.status) {
      updateFields.status = body.status;
    }
    if (body.verificationStatus) {
      updateFields['documents.verificationStatus'] = body.verificationStatus;
    }
    if (body.verificationNotes !== undefined) {
      updateFields['documents.verificationNotes'] = body.verificationNotes;
    }
    if (body.adminNotes !== undefined) {
      updateFields.adminNotes = body.adminNotes;
    }
    if (body.counterOffer !== undefined) {
      updateFields['pricing.counterOffer'] = Number(body.counterOffer) || 0;
    }
    if (body.assignedAdminName !== undefined) {
      updateFields.assignedAdminName = body.assignedAdminName;
    }

    const db = await getDb();
    const result = await db.collection('sellInquiries').updateOne(
      { id },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
    }

    const updated = await db.collection('sellInquiries').findOne({ id });
    const { _id, ...rest } = updated!;

    return NextResponse.json({
      success: true,
      inquiry: { ...rest, id: rest.id || _id.toString() },
      message: 'Inquiry updated successfully.',
    });
  } catch (err) {
    console.error('Failed to update inquiry:', err);
    return NextResponse.json({ error: 'Failed to update inquiry.' }, { status: 500 });
  }
}

// DELETE: Remove an inquiry (superadmin only)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmin can delete inquiries.' }, { status: 403 });
    }

    const { id } = await context.params;
    const db = await getDb();
    const result = await db.collection('sellInquiries').deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Inquiry deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete inquiry:', err);
    return NextResponse.json({ error: 'Failed to delete inquiry.' }, { status: 500 });
  }
}
