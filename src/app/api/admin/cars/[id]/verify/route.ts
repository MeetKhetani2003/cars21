import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, Filter, Document } from 'mongodb';
import { z } from 'zod';
import { getSession, isAdminRequest } from '@/server/auth';
import { getDb } from '@/server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const verifySchema = z.object({
  status: z.enum(['unverified', 'under_verification', 'verified', 'rejected']),
  note: z.string().max(500).optional(),
});

type Context = { params: Promise<{ id: string }> };

function buildCarFilter(id: string): Filter<Document> {
  const clauses: Filter<Document>[] = [{ id }];
  if (ObjectId.isValid(id)) {
    clauses.push({ _id: new ObjectId(id) });
  }
  return { $or: clauses };
}

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin access required to verify vehicle documents.' }, { status: 401 });
  }

  const { id } = await context.params;
  const rawBody = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid verification status required.', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const session = getSession(request);
    const db = await getDb();
    const collection = db.collection('cars');
    const filter = buildCarFilter(id);

    const existing = await collection.findOne(filter);
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle listing not found.' }, { status: 404 });
    }

    const { status, note } = parsed.data;
    const verifiedBy = {
      id: session?.sub || 'admin',
      name: session?.name || 'Administrator',
      role: session?.role || 'admin',
      at: new Date().toISOString(),
    };

    const updateDoc: Record<string, unknown> = {
      verificationStatus: status,
      verificationNote: note || '',
      verifiedBy,
      updatedAt: new Date(),
    };

    // If approved as verified, also update badge if it was Cars21 default
    if (status === 'verified' && (!existing.badge || existing.badge === 'Cars21 listing')) {
      updateDoc.badge = 'Cars21 verified';
    }

    await collection.updateOne(filter, { $set: updateDoc });

    return NextResponse.json({
      success: true,
      id,
      verificationStatus: status,
      verificationNote: note || '',
      verifiedBy,
    });
  } catch {
    return NextResponse.json({ error: 'Vehicle verification could not be saved.' }, { status: 503 });
  }
}
