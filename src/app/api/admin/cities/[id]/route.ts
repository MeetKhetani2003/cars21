import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ObjectId, Filter, Document } from 'mongodb';
import { isAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildIdFilter(id: string): Filter<Document> {
  const clauses: Filter<Document>[] = [{ id }];
  if (ObjectId.isValid(id)) {
    clauses.push({ _id: new ObjectId(id) });
  }
  return { $or: clauses };
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  popular: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid city details.' }, { status: 400 });
  try {
    const db = await getDb();
    const filter = buildIdFilter(id);
    const result = await db.collection('cities').updateOne(filter, {
      $set: { ...parsed.data, updatedAt: new Date() }
    });
    if (!result.matchedCount) return NextResponse.json({ error: 'City not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'City could not be updated.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  try {
    const db = await getDb();
    const filter = buildIdFilter(id);
    const result = await db.collection('cities').deleteOne(filter);
    if (!result.deletedCount) return NextResponse.json({ error: 'City not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'City could not be deleted.' }, { status: 503 });
  }
}

