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
  visitorId: z.string().trim().max(120).optional(),
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
    const isGoogle = session?.role === 'buyer' && Boolean(session.sub);
    const actionUserId = isGoogle ? session.sub : `lead_${parsed.data.phone}`;

    const doc = {
      id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      carId: parsed.data.carId || null,
      source: parsed.data.source,
      userId: actionUserId,
      isGoogleUser: isGoogle,
      status: 'new' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('buyLeads').insertOne(doc);

    // Record lead capture action into user_actions telemetry
    await db.collection('user_actions').insertOne({
      userId: actionUserId,
      clientName: parsed.data.name,
      clientEmail: isGoogle ? (session.email || '') : `${parsed.data.phone}@lead.cars21.com`,
      phone: parsed.data.phone,
      city: parsed.data.city,
      isLeadSession: !isGoogle,
      action: 'buy_lead_captured',
      targetType: 'lead',
      targetLabel: `Lead Form Submitted: ${parsed.data.name} (${parsed.data.phone}, ${parsed.data.city})`,
      createdAt: new Date()
    }).catch(() => null);

    // Connect previous guest actions to this lead session
    if (parsed.data.visitorId) {
      await db.collection('user_actions').updateMany(
        { userId: parsed.data.visitorId },
        { 
          $set: { 
            userId: actionUserId, 
            clientName: parsed.data.name, 
            phone: parsed.data.phone, 
            city: parsed.data.city,
            isLeadSession: true
          } 
        }
      ).catch(() => null);
    }

    return NextResponse.json({ ok: true, leadId: id, actionUserId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to record lead. Please try again.' },
      { status: 500 }
    );
  }
}
