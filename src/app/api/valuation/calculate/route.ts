import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '../../../../server/mongodb';
import { estimateCarValuation, ValuationInput } from '../../../../lib/valuation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const valuationSchema = z.object({
  make: z.string().trim().max(60).optional().default(''),
  model: z.string().trim().max(80).optional().default(''),
  year: z.coerce.number().int().min(1990).max(2100).optional().default(2023),
  variant: z.string().trim().max(100).optional().default(''),
  km: z.coerce.number().int().min(0).max(2000000).optional().default(32000),
  fuel: z.string().trim().max(30).optional().default('Petrol'),
  transmission: z.string().trim().max(30).optional().default('Manual'),
  owners: z.coerce.number().int().min(1).max(10).optional().default(1),
  condition: z.string().trim().max(40).optional().default('Good'),
  city: z.string().trim().max(80).optional().default('Bengaluru'),
  registration: z.string().trim().max(20).optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = valuationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid car specifications.' }, { status: 400 });
    }

    const input: ValuationInput = parsed.data;
    let liveMarketAverage: number | undefined;
    let similarCars: any[] = [];
    let matchingDbCount = 0;

    try {
      const db = await getDb();
      if (input.make && input.model) {
        const query: Record<string, any> = {
          make: { $regex: new RegExp(`^${input.make.trim()}$`, 'i') },
          model: { $regex: new RegExp(`^${input.model.trim()}$`, 'i') },
          status: { $ne: 'inactive' }
        };

        const matchingCars = await db.collection('cars').find(query, {
          projection: {
            id: 1,
            make: 1,
            model: 1,
            variant: 1,
            year: 1,
            price: 1,
            km: 1,
            fuel: 1,
            transmission: 1,
            city: 1,
            score: 1,
            imageId: 1,
            image: 1
          }
        }).limit(8).toArray();

        matchingDbCount = matchingCars.length;
        if (matchingCars.length > 0) {
          const prices = matchingCars.map(c => Number(c.price)).filter(p => Number.isFinite(p) && p > 50000);
          if (prices.length > 0) {
            liveMarketAverage = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
          }
          similarCars = matchingCars.slice(0, 3);
        }
      }

      // Record valuation inquiry in database for analytics / lead insights
      await db.collection('valuations').insertOne({
        ...input,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        createdAt: new Date()
      }).catch(() => {});
    } catch {
      // Proceed even if database lookup is temporarily quiet
    }

    const valuation = estimateCarValuation(input, liveMarketAverage);
    valuation.matchingDbListingsCount = matchingDbCount;

    return NextResponse.json({
      valuation,
      similarCars,
      input
    });
  } catch (error) {
    return NextResponse.json({ error: 'Valuation service is temporarily unavailable.' }, { status: 500 });
  }
}

