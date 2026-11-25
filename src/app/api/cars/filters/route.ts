import { NextResponse } from 'next/server';
import { getDb } from '../../../../server/mongodb';
import { sortCityNames } from '../../../../lib/cities';

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
    const cityMetaLookup: Record<string, { state?: string; pincode?: string; popular?: boolean }> = {};
    for (const c of managedCities) {
      const name = String(c.name || '').trim();
      if (name) {
        cityMetaLookup[name.toLowerCase()] = {
          state: String(c.state || ''),
          pincode: String(c.pincode || ''),
          popular: Boolean(c.popular),
        };
      }
    }

    const allCities = sortCityNames(
      [...new Set([
        ...managedCities.map(c => String(c.name || '').trim()),
        ...cars.map(car => String(car.city ?? '').trim())
      ].filter(Boolean))],
      cityMetaLookup
    );

    const allMakes = [...new Set([
      ...managedMakes.map(m => String(m.name || '').trim()),
      ...cars.map(car => String(car.make ?? '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const allModels = [...new Set([
      ...managedMakes.flatMap(m => (Array.isArray(m.models) ? m.models : []).filter((mod: any) => mod.status !== 'inactive').map((mod: any) => String(mod.name || '').trim())),
      ...cars.map(car => String(car.model ?? '').trim())
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const popularCities = sortCityNames(
      managedCities.filter(c => c.popular).map(c => String(c.name)).filter(Boolean),
      cityMetaLookup
    );
    const makeCounts = cars.reduce<Record<string, number>>((acc, car) => {
      const m = String(car.make ?? '').trim();
      if (m) acc[m.toLowerCase()] = (acc[m.toLowerCase()] || 0) + 1;
      return acc;
    }, {});

    const popularMakes = managedMakes.filter(m => m.popular).map(m => ({
      make: String(m.name),
      code: String(m.code || m.name.slice(0, 2).toUpperCase()),
      country: String(m.country || ''),
      count: makeCounts[String(m.name).trim().toLowerCase()] || 0,
    }));

    const seenMakes = new Set<string>();
    const allMakesMeta: Array<{ make: string; code: string; country: string; count: number; popular: boolean }> = [];
    for (const m of managedMakes) {
      const name = String(m.name || '').trim();
      if (!name) continue;
      seenMakes.add(name.toLowerCase());
      allMakesMeta.push({
        make: name,
        code: String(m.code || name.slice(0, 2).toUpperCase()),
        country: String(m.country || ''),
        count: makeCounts[name.toLowerCase()] || 0,
        popular: Boolean(m.popular),
      });
    }
    for (const mName of base.makes) {
      if (!seenMakes.has(mName.toLowerCase())) {
        seenMakes.add(mName.toLowerCase());
        allMakesMeta.push({
          make: mName,
          code: mName.slice(0, 2).toUpperCase(),
          country: '',
          count: makeCounts[mName.toLowerCase()] || 0,
          popular: false,
        });
      }
    }
    allMakesMeta.sort((a, b) => Number(b.popular) - Number(a.popular) || a.make.localeCompare(b.make));

    return NextResponse.json({
      ...base,
      cities: allCities.length ? allCities : base.cities,
      makes: allMakes.length ? allMakes : base.makes,
      models: allModels.length ? allModels : base.models,
      popularCities,
      popularMakes,
      allMakesMeta,
      source: 'mongodb'
    });
  } catch (error: any) {
    console.error('API /cars/filters database error:', error?.message || error);
    return NextResponse.json({ cities: [], makes: [], models: [], fuels: [], bodyTypes: [], transmissions: [], minPrice: 0, maxPrice: 0, source: 'mongodb' });
  }
}
