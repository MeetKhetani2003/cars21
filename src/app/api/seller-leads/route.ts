import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '../../../server/mongodb';
import { getSession } from '../../../server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  registration: z.string().trim().min(4).max(16), make: z.string().trim().min(2).max(60), model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1980).max(2100), km: z.coerce.number().int().min(0).max(2_000_000), fuel: z.string().trim().max(30), transmission: z.string().trim().max(30),
  owners: z.coerce.number().int().min(1).max(10), condition: z.string().trim().max(40), city: z.string().trim().min(2).max(80),
  estimatedLow: z.coerce.number().nonnegative(), estimatedHigh: z.coerce.number().nonnegative(),
  inspectionMode: z.string().trim().min(2).max(50), preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), preferredTime: z.string().trim().min(3).max(30), address: z.string().trim().max(300).optional().default(''),
  name: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^\+?[\d\s()-]{10,18}$/).refine(value => { const digits = value.replace(/\D/g, '').length; return digits >= 10 && digits <= 15; }), email: z.union([z.string().trim().email().max(160), z.literal('')]).optional().default(''), consent: z.literal(true),
}).superRefine((value, context) => {
  if (value.estimatedHigh < value.estimatedLow) context.addIssue({ code: 'custom', path: ['estimatedHigh'], message: 'Check the estimate range.' });
  const [year, month, day] = value.preferredDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) context.addIssue({ code: 'custom', path: ['preferredDate'], message: 'Choose a valid date.' });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  if (value.preferredDate < today) context.addIssue({ code: 'custom', path: ['preferredDate'], message: 'Choose today or a future date.' });
});

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (session?.role !== 'buyer') return NextResponse.json({ error: 'Sign in with Google before requesting to sell your car.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the vehicle, contact, and inspection details and try again.' }, { status: 400 });
  try {
    const db = await getDb();
    const buyer = await db.collection<Record<string, unknown>>('buyers').findOne({ id: session.sub, trackingConsentAt: { $exists: true } }, { projection: { name: 1, email: 1 } });
    if (!buyer) return NextResponse.json({ error: 'Sign in with Google before requesting to sell your car.' }, { status: 401 });
    const id = randomBytes(12).toString('hex');
    await db.collection('sellerLeads').insertOne({ id, ...parsed.data, userId: session.sub, name: String(buyer.name || parsed.data.name), email: String(buyer.email || parsed.data.email || ''), status: 'new', verificationStatus: 'pending', createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ id, saved: true }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Your seller request could not be saved right now.' }, { status: 503 }); }
}
