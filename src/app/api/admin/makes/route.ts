import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type MakeRecord = {
  id: string;
  name: string;
  country: string;
  code: string;
  popular: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_MAKES = [
  { name: 'Maruti Suzuki', country: 'India / Japan', code: 'MS', popular: true, status: 'active' },
  { name: 'Hyundai', country: 'South Korea', code: 'HY', popular: true, status: 'active' },
  { name: 'Tata', country: 'India', code: 'TA', popular: true, status: 'active' },
  { name: 'Mahindra', country: 'India', code: 'MH', popular: true, status: 'active' },
  { name: 'Honda', country: 'Japan', code: 'HO', popular: true, status: 'active' },
  { name: 'Toyota', country: 'Japan', code: 'TY', popular: true, status: 'active' },
  { name: 'Kia', country: 'South Korea', code: 'KA', popular: true, status: 'active' },
  { name: 'Volkswagen', country: 'Germany', code: 'VW', popular: true, status: 'active' },
  { name: 'Skoda', country: 'Czech Republic', code: 'SK', popular: false, status: 'active' },
  { name: 'MG', country: 'UK / China', code: 'MG', popular: false, status: 'active' },
  { name: 'Renault', country: 'France', code: 'RN', popular: false, status: 'active' },
  { name: 'Nissan', country: 'Japan', code: 'NS', popular: false, status: 'active' },
  { name: 'BMW', country: 'Germany', code: 'BMW', popular: false, status: 'active' },
  { name: 'Mercedes-Benz', country: 'Germany', code: 'MB', popular: false, status: 'active' },
  { name: 'Audi', country: 'Germany', code: 'AD', popular: false, status: 'active' },
  { name: 'Jeep', country: 'USA', code: 'JP', popular: false, status: 'active' },
  { name: 'Volvo', country: 'Sweden', code: 'VO', popular: false, status: 'active' },
];

const makeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  country: z.string().trim().max(80).default(''),
  code: z.string().trim().max(10).default(''),
  popular: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
});

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection('makes');
    const count = await collection.countDocuments();
    if (count === 0) {
      const now = new Date();
      const seedData = DEFAULT_MAKES.map(m => ({
        id: m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ...m,
        createdAt: now,
        updatedAt: now,
      }));
      await collection.insertMany(seedData);
    }
    const makes = await collection.find({}).sort({ popular: -1, name: 1 }).toArray();
    return NextResponse.json({
      makes: makes.map(({ _id, ...make }) => ({
        ...make,
        id: make.id || String(_id),
      }))
    });
  } catch {
    return NextResponse.json({ error: 'Vehicle companies are temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const parsed = makeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle company details.' }, { status: 400 });
  try {
    const db = await getDb();
    const collection = db.collection('makes');
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await collection.findOne({
      $or: [
        { id: slug },
        { name: { $regex: new RegExp(`^${parsed.data.name}$`, 'i') } }
      ]
    });
    if (existing) return NextResponse.json({ error: 'A vehicle company with that name already exists.' }, { status: 409 });
    const now = new Date();
    const code = parsed.data.code || parsed.data.name.slice(0, 2).toUpperCase();
    const newMake = {
      id: slug,
      ...parsed.data,
      code,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(newMake);
    return NextResponse.json({ make: newMake }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Vehicle company could not be created.' }, { status: 503 });
  }
}

