import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ObjectId, Filter, Document } from 'mongodb';
import { isAdminRequest } from '../../../../../server/auth';
import { getDb } from '../../../../../server/mongodb';
import { CarModelRecord } from '../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildIdFilter(id: string): Filter<Document> {
  const clauses: Filter<Document>[] = [{ id }];
  if (ObjectId.isValid(id)) {
    clauses.push({ _id: new ObjectId(id) });
  }
  return { $or: clauses };
}

const modelSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(80),
  body: z.string().trim().max(40).default('SUV'),
  years: z.array(z.number().int().min(1980).max(2100)).default([2022, 2023, 2024, 2025, 2026]),
  popular: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  country: z.string().trim().max(80).optional(),
  code: z.string().trim().max(10).optional(),
  popular: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  models: z.array(modelSchema).optional(),
  action: z.enum(['add_model', 'update_model', 'delete_model']).optional(),
  model: modelSchema.optional(),
  modelId: z.string().optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle company details.' }, { status: 400 });

  try {
    const db = await getDb();
    const filter = buildIdFilter(id);
    const existing = await db.collection('makes').findOne(filter);
    if (!existing) return NextResponse.json({ error: 'Vehicle company not found.' }, { status: 404 });

    const currentModels: CarModelRecord[] = Array.isArray(existing.models) ? existing.models : [];

    // Handle atomic model actions
    if (parsed.data.action === 'add_model' && parsed.data.model) {
      const m = parsed.data.model;
      const modelSlug = m.id || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Check if duplicate model name
      if (currentModels.some(existingM => existingM.name.toLowerCase() === m.name.toLowerCase())) {
        return NextResponse.json({ error: `Model "${m.name}" already exists for this company.` }, { status: 409 });
      }
      const newModel: CarModelRecord = {
        id: modelSlug,
        name: m.name,
        body: m.body || 'SUV',
        years: m.years && m.years.length ? m.years : [2022, 2023, 2024, 2025, 2026],
        popular: Boolean(m.popular),
        status: m.status || 'active',
      };
      await db.collection('makes').updateOne(filter, {
        $push: { models: newModel } as any,
        $set: { updatedAt: new Date() }
      });
      return NextResponse.json({ ok: true, model: newModel });
    }

    if (parsed.data.action === 'update_model' && parsed.data.model) {
      const m = parsed.data.model;
      const targetId = m.id || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const updatedList = currentModels.map(existingM => {
        if (existingM.id === targetId || existingM.name.toLowerCase() === m.name.toLowerCase()) {
          return {
            id: existingM.id || targetId,
            name: m.name,
            body: m.body || existingM.body || 'SUV',
            years: m.years && m.years.length ? m.years : existingM.years,
            popular: m.popular !== undefined ? m.popular : existingM.popular,
            status: m.status || existingM.status,
          };
        }
        return existingM;
      });
      await db.collection('makes').updateOne(filter, {
        $set: { models: updatedList, updatedAt: new Date() }
      });
      return NextResponse.json({ ok: true, models: updatedList });
    }

    if (parsed.data.action === 'delete_model' && parsed.data.modelId) {
      const targetId = parsed.data.modelId.toLowerCase();
      const updatedList = currentModels.filter(m => m.id.toLowerCase() !== targetId && m.name.toLowerCase() !== targetId);
      await db.collection('makes').updateOne(filter, {
        $set: { models: updatedList, updatedAt: new Date() }
      });
      return NextResponse.json({ ok: true, models: updatedList });
    }

    // Standard updates (including full models array if provided)
    const updateDoc: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updateDoc.name = parsed.data.name;
    if (parsed.data.country !== undefined) updateDoc.country = parsed.data.country;
    if (parsed.data.code !== undefined) updateDoc.code = parsed.data.code;
    if (parsed.data.popular !== undefined) updateDoc.popular = parsed.data.popular;
    if (parsed.data.status !== undefined) updateDoc.status = parsed.data.status;
    if (parsed.data.models !== undefined) {
      updateDoc.models = parsed.data.models.map(m => ({
        id: m.id || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: m.name,
        body: m.body || 'SUV',
        years: m.years && m.years.length ? m.years : [2022, 2023, 2024, 2025, 2026],
        popular: Boolean(m.popular),
        status: m.status || 'active',
      }));
    }

    const result = await db.collection('makes').updateOne(filter, { $set: updateDoc });
    if (!result.matchedCount) return NextResponse.json({ error: 'Vehicle company not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Vehicle company could not be updated.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { id } = await context.params;
  try {
    const db = await getDb();
    const filter = buildIdFilter(id);
    const result = await db.collection('makes').deleteOne(filter);
    if (!result.deletedCount) return NextResponse.json({ error: 'Vehicle company not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Vehicle company could not be deleted.' }, { status: 503 });
  }
}
