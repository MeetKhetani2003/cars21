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
    const db = await getDb();
    const [cars, managedCities, managedMakes] = await Promise.all([
      db.collection<Record<string, unknown>>('cars')
        .find(publicStatus, { projection: { city: 1, make: 1, model: 1, fuel: 1, body: 1, transmission: 1, price: 1 } })
        .limit(5000).toArray(),
      db.collection('cities').find({ status: { $ne: 'inactive' } }).toArray().catch(() => []),
      db.collection('makes').find({ status: { $ne: 'inactive' } }).toArray().catch(() => []),
    ]);

    const base = buildOptions(cars);
    const allCities = [...new Set([
      ...managedCities.map(c => String(c.name || '').trim()),
      ...cars.map(car => String(car.city ?? '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const allMakes = [...new Set([
      ...managedMakes.map(m => String(m.name || '').trim()),
      ...cars.map(car => String(car.make ?? '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const allModels = [...new Set([
      ...managedMakes.flatMap(m => (Array.isArray(m.models) ? m.models : []).filter((mod: any) => mod.status !== 'inactive').map((mod: any) => String(mod.name || '').trim())),
      ...cars.map(car => String(car.model ?? '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const popularCities = managedCities.filter(c => c.popular).map(c => String(c.name)).filter(Boolean);
    const popularMakes = managedMakes.filter(m => m.popular).map(m => ({
      make: String(m.name),
      code: String(m.code || m.name.slice(0, 2).toUpperCase()),
      country: String(m.country || '')
    }));

    if (cars.length || managedCities.length || managedMakes.length || process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        ...base,
        cities: allCities.length ? allCities : base.cities,
        makes: allMakes.length ? allMakes : base.makes,
        models: allModels.length ? allModels : base.models,
        popularCities,
        popularMakes,
        source: 'mongodb'
      });
    }
  } catch {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Inventory filters are temporarily unavailable.' }, { status: 503 });
  }
  return NextResponse.json({ ...buildOptions(demoCars as unknown as Record<string, unknown>[]), source: 'demo' });
}
