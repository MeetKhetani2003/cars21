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
  pincode?: string;
  popular: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_CITIES = [
  { name: 'Bengaluru', state: 'Karnataka', pincode: '560001', popular: true, status: 'active' },
  { name: 'Mumbai', state: 'Maharashtra', pincode: '400001', popular: true, status: 'active' },
  { name: 'Delhi NCR', state: 'Delhi', pincode: '110001', popular: true, status: 'active' },
  { name: 'Hyderabad', state: 'Telangana', pincode: '500001', popular: true, status: 'active' },
  { name: 'Pune', state: 'Maharashtra', pincode: '411001', popular: true, status: 'active' },
  { name: 'Chennai', state: 'Tamil Nadu', pincode: '600001', popular: true, status: 'active' },
  { name: 'Ahmedabad', state: 'Gujarat', pincode: '380001', popular: true, status: 'active' },
  { name: 'Surat', state: 'Gujarat', pincode: '395001', popular: true, status: 'active' },
  { name: 'Vadodara', state: 'Gujarat', pincode: '390001', popular: false, status: 'active' },
  { name: 'Rajkot', state: 'Gujarat', pincode: '360001', popular: false, status: 'active' },
  // GUJARAT PINCODE 362xxx SERIES (Junagadh & Saurashtra Postal Division)
  { name: 'Junagadh (HO)', state: 'Gujarat', pincode: '362001', popular: true, status: 'active' },
  { name: 'Junagadh City (Sardarbag)', state: 'Gujarat', pincode: '362002', popular: true, status: 'active' },
  { name: 'Junagadh (JAU / Motibaug)', state: 'Gujarat', pincode: '362003', popular: false, status: 'active' },
  { name: 'Joshipura (Junagadh)', state: 'Gujarat', pincode: '362004', popular: false, status: 'active' },
  { name: 'Bilkha (Junagadh)', state: 'Gujarat', pincode: '362011', popular: false, status: 'active' },
  { name: 'Dungarpur (Junagadh)', state: 'Gujarat', pincode: '362015', popular: false, status: 'active' },
  { name: 'Bhesan (Junagadh)', state: 'Gujarat', pincode: '362020', popular: false, status: 'active' },
  { name: 'Prabhas Patan (Somnath)', state: 'Gujarat', pincode: '362030', popular: false, status: 'active' },
  { name: 'Shapur (Junagadh)', state: 'Gujarat', pincode: '362037', popular: false, status: 'active' },
  { name: 'Vanthali (Junagadh)', state: 'Gujarat', pincode: '362110', popular: false, status: 'active' },
  { name: 'Mendarda (Junagadh)', state: 'Gujarat', pincode: '362120', popular: false, status: 'active' },
  { name: 'Visavadar (Junagadh)', state: 'Gujarat', pincode: '362130', popular: false, status: 'active' },
  { name: 'Manavadar (Junagadh)', state: 'Gujarat', pincode: '362150', popular: false, status: 'active' },
  { name: 'Bantwa (Junagadh)', state: 'Gujarat', pincode: '362205', popular: false, status: 'active' },
  { name: 'Keshod Airport', state: 'Gujarat', pincode: '362215', popular: false, status: 'active' },
  { name: 'Keshod (Junagadh)', state: 'Gujarat', pincode: '362220', popular: false, status: 'active' },
  { name: 'Mangrol (Junagadh)', state: 'Gujarat', pincode: '362225', popular: false, status: 'active' },
  { name: 'Sil (Junagadh)', state: 'Gujarat', pincode: '362245', popular: false, status: 'active' },
  { name: 'Chorwad (Junagadh)', state: 'Gujarat', pincode: '362250', popular: false, status: 'active' },
  { name: 'Gadu (Junagadh)', state: 'Gujarat', pincode: '362255', popular: false, status: 'active' },
  { name: 'Veraval (Gir Somnath)', state: 'Gujarat', pincode: '362265', popular: false, status: 'active' },
  { name: 'Talala Gir (Junagadh)', state: 'Gujarat', pincode: '362275', popular: false, status: 'active' },
  { name: 'Una (Gir Somnath)', state: 'Gujarat', pincode: '362560', popular: false, status: 'active' },
  { name: 'Delvada (Una)', state: 'Gujarat', pincode: '362565', popular: false, status: 'active' },
  { name: 'Kodinar (Gir Somnath)', state: 'Gujarat', pincode: '362570', popular: false, status: 'active' },
  // Other major Indian cities
  { name: 'Kolkata', state: 'West Bengal', pincode: '700001', popular: false, status: 'active' },
  { name: 'Jaipur', state: 'Rajasthan', pincode: '302001', popular: false, status: 'active' },
  { name: 'Chandigarh', state: 'Punjab', pincode: '160017', popular: false, status: 'active' },
  { name: 'Kochi', state: 'Kerala', pincode: '682001', popular: false, status: 'active' },
  { name: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', popular: false, status: 'active' },
  { name: 'Indore', state: 'Madhya Pradesh', pincode: '452001', popular: false, status: 'active' },
];

const citySchema = z.object({
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().max(10).default('').optional(),
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
    } else {
      // Upsert any missing Gujarat 362xxx series cities so they are always present
      for (const defCity of DEFAULT_CITIES) {
        const slug = defCity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const exists = await collection.findOne({
          $or: [
            { id: slug },
            { name: { $regex: new RegExp(`^${defCity.name}$`, 'i') } },
            ...(defCity.pincode ? [{ pincode: defCity.pincode }] : [])
          ]
        });
        if (!exists) {
          await collection.insertOne({
            id: slug,
            ...defCity,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else if (defCity.pincode && !exists.pincode) {
          await collection.updateOne({ _id: exists._id }, { $set: { pincode: defCity.pincode } });
        }
      }
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

