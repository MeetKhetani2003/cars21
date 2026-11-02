import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { isAdminRequest, isSuperAdminRequest, getSession } from '@/server/auth';
import { getDb } from '@/server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateLoanSchema = z.object({
  status: z.enum(['new', 'under_review', 'documents_verified', 'approved', 'rejected', 'disbursed']).optional(),
  adminNotes: z.string().max(2000).optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const raw = await request.json().catch(() => null);
  const parsed = updateLoanSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update payload.', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const session = getSession(request);
    const db = await getDb();
    const collection = db.collection('loan_applications');

    const filter: Record<string, any> = {
      $or: [
        { id },
        { applicationNumber: id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
      ],
    };

    const existing = await collection.findOne(filter);
    if (!existing) {
      return NextResponse.json({ error: 'Loan application not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (parsed.data.status) {
      updates.status = parsed.data.status;
      updates.reviewedBy = {
        id: session?.sub || 'admin',
        name: session?.name || 'Administrator',
        role: session?.role || 'admin',
        at: new Date().toISOString(),
      };
    }

    if (parsed.data.adminNotes !== undefined) {
      updates.adminNotes = parsed.data.adminNotes;
    }

    await collection.updateOne(filter, { $set: updates });

    return NextResponse.json({
      success: true,
      id,
      ...updates,
    });
  } catch (error) {
    console.error('Error updating loan application:', error);
    return NextResponse.json({ error: 'Could not update loan application.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isSuperAdminRequest(request)) {
    return NextResponse.json({ error: 'Superadmin access required to remove loan applications.' }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const db = await getDb();
    const filter = {
      $or: [
        { id },
        { applicationNumber: id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
      ],
    };

    const res = await db.collection('loan_applications').deleteOne(filter);
    if (!res.deletedCount) {
      return NextResponse.json({ error: 'Loan application not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Loan application removed.' });
  } catch (error) {
    console.error('Error deleting loan application:', error);
    return NextResponse.json({ error: 'Could not delete loan application.' }, { status: 500 });
  }
}

