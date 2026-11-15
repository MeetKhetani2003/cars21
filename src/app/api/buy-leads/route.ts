import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../server/auth';
import { getDb } from '../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const leadSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(100),
  phone: z.string().trim().transform(v => v.replace(/\D/g, '')).refine(v => /^[6-9]\d{9}$/.test(v), {
    message: 'Please enter a valid 10-digit mobile number'
  }),
  city: z.string().trim().min(2, 'Please enter or select your city').max(80),
  carId: z.string().trim().max(100).optional(),
  source: z.string().trim().max(100).optional().default('buy_car_modal'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid lead details';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const session = getSession(request);
    const db = await getDb();

    const id = `buy-lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const doc = {
      id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      carId: parsed.data.carId || null,
      source: parsed.data.source,
      userId: session?.role === 'buyer' ? session.sub : null,
      status: 'new' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('buyLeads').insertOne(doc);

    // Also record user action if user is logged in
    if (session?.role === 'buyer') {
      await db.collection('user_actions').insertOne({
        userId: session.sub,
        clientName: parsed.data.name,
        clientEmail: session.email || '',
        action: 'buy_lead_captured',
        targetType: 'lead',
        targetLabel: `${parsed.data.name} (${parsed.data.city})`,
        phone: parsed.data.phone,
        city: parsed.data.city,
        createdAt: new Date()
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, leadId: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to record lead. Please try again.' },
      { status: 500 }
    );
  }
}
