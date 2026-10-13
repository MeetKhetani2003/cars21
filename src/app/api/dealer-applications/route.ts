import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ name: z.string().trim().min(2).max(100), businessName: z.string().trim().min(2).max(120), email: z.string().trim().email().max(160), phone: z.string().trim().regex(/^\+?[\d\s()-]{10,18}$/).refine(value => { const digits = value.replace(/\D/g, '').length; return digits >= 10 && digits <= 15; }), city: z.string().trim().min(2).max(80), consent: z.literal(true) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check your dealership and contact details and try again.' }, { status: 400 });
  try {
    const id = randomBytes(12).toString('hex');
    await (await getDb()).collection('dealerApplications').insertOne({ id, ...parsed.data, status: 'new', createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ id, saved: true }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Your dealership request could not be saved right now.' }, { status: 503 }); }
}
