import 'server-only';
import { cars as demoCars } from '../data';
import { getDb } from './mongodb';

/** Import local demo cars once into development MongoDB so public and admin data match. */
export async function ensureDevelopmentDemoInventory() {
  if (process.env.NODE_ENV === 'production') return;

  const db = await getDb();
  const settings = db.collection<{ _id: string; createdAt?: Date }>('systemSettings');
  if (await settings.findOne({ _id: 'dev-demo-inventory-seeded' })) return;

  const now = new Date();
  await db.collection<Record<string, unknown>>('cars').bulkWrite(demoCars.map(car => ({
    updateOne: {
      filter: { id: car.id },
      update: { $setOnInsert: { ...car, status: 'active', createdAt: now, updatedAt: now } },
      upsert: true,
    },
  })), { ordered: false });
  await settings.updateOne(
    { _id: 'dev-demo-inventory-seeded' },
    { $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}
