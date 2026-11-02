import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CityRecord = {
  id: string;
  name: string;
  state: string;
  popular: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_CITIES = [
  { name: 'Bengaluru', state: 'Karnataka', popular: true, status: 'active' },
  { name: 'Mumbai', state: 'Maharashtra', popular: true, status: 'active' },
  { name: 'Delhi NCR', state: 'Delhi', popular: true, status: 'active' },
  { name: 'Hyderabad', state: 'Telangana', popular: true, status: 'active' },
  { name: 'Pune', state: 'Maharashtra', popular: true, status: 'active' },
  { name: 'Chennai', state: 'Tamil Nadu', popular: true, status: 'active' },
  { name: 'Ahmedabad', state: 'Gujarat', popular: true, status: 'active' },
  { name: 'Kolkata', state: 'West Bengal', popular: false, status: 'active' },
  { name: 'Jaipur', state: 'Rajasthan', popular: false, status: 'active' },
  { name: 'Chandigarh', state: 'Punjab', popular: false, status: 'active' },
  { name: 'Kochi', state: 'Kerala', popular: false, status: 'active' },
  { name: 'Lucknow', state: 'Uttar Pradesh', popular: false, status: 'active' },
  { name: 'Surat', state: 'Gujarat', popular: false, status: 'active' },
  { name: 'Indore', state: 'Madhya Pradesh', popular: false, status: 'active' },
];

const citySchema = z.object({
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  popular: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
});

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection('cities');
    const count = await collection.countDocuments();
    if (count === 0) {
      const now = new Date();
      const seedData = DEFAULT_CITIES.map(c => ({
        id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ...c,
        createdAt: now,
        updatedAt: now,
      }));
      await collection.insertMany(seedData);
    }
    const cities = await collection.find({}).sort({ popular: -1, name: 1 }).toArray();
    return NextResponse.json({
      cities: cities.map(({ _id, ...city }) => ({
        ...city,
        id: city.id || String(_id),
      }))
    });
  } catch {
    return NextResponse.json({ error: 'Cities are temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const parsed = citySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid city details.' }, { status: 400 });
  try {
    const db = await getDb();
    const collection = db.collection('cities');
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await collection.findOne({
      $or: [
        { id: slug },
        { name: { $regex: new RegExp(`^${parsed.data.name}$`, 'i') } }
      ]
    });
    if (existing) return NextResponse.json({ error: 'A city with that name already exists.' }, { status: 409 });
    const now = new Date();
    const newCity = {
      id: slug,
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(newCity);
    return NextResponse.json({ city: newCity }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'City could not be created.' }, { status: 503 });
  }
}

