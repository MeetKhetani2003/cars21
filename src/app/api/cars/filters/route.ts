import { NextResponse } from 'next/server';
import { cars as demoCars } from '../../../../data';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const publicStatus = { $or: [{ status: 'active' }, { status: { $exists: false } }] };

function buildOptions(cars: Record<string, unknown>[]) {
  const values = (key: string) => [...new Set(cars.map(car => String(car[key] ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const prices = cars.map(car => Number(car.price)).filter(price => Number.isFinite(price) && price > 0);
  return {
    cities: values('city'), makes: values('make'), models: values('model'),
    fuels: values('fuel'), bodyTypes: values('body'), transmissions: values('transmission'),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  };
}

export async function GET() {
  try {
    const cars = await (await getDb()).collection<Record<string, unknown>>('cars')
      .find(publicStatus, { projection: { city: 1, make: 1, model: 1, fuel: 1, body: 1, transmission: 1, price: 1 } })
      .limit(5000).toArray();
    if (cars.length || process.env.NODE_ENV === 'production') return NextResponse.json({ ...buildOptions(cars), source: 'mongodb' });
  } catch {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Inventory filters are temporarily unavailable.' }, { status: 503 });
  }
  return NextResponse.json({ ...buildOptions(demoCars as unknown as Record<string, unknown>[]), source: 'demo' });
}
