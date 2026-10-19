import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const day = 24 * 60 * 60 * 1000;
function dateStart(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'users';
  const bucket = searchParams.get('bucket') || 'all';
  if (!['users', 'events'].includes(mode) || !['all', 'recent', 'history'].includes(bucket)) return NextResponse.json({ error: 'Choose a valid history view.' }, { status: 400 });
  try {
    const db = await getDb();
    const collection = db.collection<Record<string, unknown>>('user_actions');
    await Promise.all([collection.createIndex({ userId: 1, createdAt: -1 }), collection.createIndex({ carId: 1, createdAt: -1 }), collection.createIndex({ vendorId: 1, createdAt: -1 })]);
    const cutoff = new Date(Date.now() - 7 * day);
    if (mode === 'users') {
      const clients = await collection.aggregate([
        { $match: { userId: { $exists: true, $ne: '' } } },
        { $sort: { createdAt: -1 } },
        { $group: {
          _id: '$userId', name: { $first: '$clientName' }, email: { $first: '$clientEmail' }, lastSeen: { $max: '$createdAt' },
          recentCount: { $sum: { $cond: [{ $gte: ['$createdAt', cutoff] }, 1, 0] } },
          historyCount: { $sum: { $cond: [{ $lt: ['$createdAt', cutoff] }, 1, 0] } },
          totalCount: { $sum: 1 },
        } },
        ...(bucket === 'recent' ? [{ $match: { recentCount: { $gt: 0 } } }] : bucket === 'history' ? [{ $match: { historyCount: { $gt: 0 } } }] : []),
        { $sort: { lastSeen: -1 } }, { $limit: 1000 },
        { $project: { _id: 0, userId: '$_id', name: 1, email: 1, lastSeen: 1, recentCount: 1, historyCount: 1, totalCount: 1 } },
      ]).toArray();
      return NextResponse.json({ clients, bucket, cutoff });
    }

    const userId = searchParams.get('userId')?.slice(0, 100) || '';
    if (!userId) return NextResponse.json({ error: 'Select a client to view their history.' }, { status: 400 });
    const from = dateStart(searchParams.get('from'));
    const to = dateStart(searchParams.get('to'));
    if (from === undefined || to === undefined) return NextResponse.json({ error: 'Use valid start and end dates.' }, { status: 400 });
    if (from && to && from > to) return NextResponse.json({ error: 'The start date must be before the end date.' }, { status: 400 });
    const filter: Record<string, unknown> = { userId };
    const dateConditions: Record<string, Date>[] = [];
    if (bucket === 'recent') dateConditions.push({ $gte: cutoff });
    if (bucket === 'history') dateConditions.push({ $lt: cutoff });
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lt = new Date(to.getTime() + day);
      dateConditions.push(range);
    }
    if (dateConditions.length === 1) filter.createdAt = dateConditions[0];
    else if (dateConditions.length > 1) filter.$and = dateConditions.map(createdAt => ({ createdAt }));
    const targetType = searchParams.get('targetType');
    if (targetType && ['car', 'vendor', 'search'].includes(targetType)) filter.targetType = targetType;
    const carId = searchParams.get('carId')?.slice(0, 100);
    const vendorId = searchParams.get('vendorId')?.slice(0, 100);
    if (carId) filter.carId = carId;
    if (vendorId) filter.vendorId = vendorId;
    const [events, client] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).limit(2000).toArray(),
      db.collection<Record<string, unknown>>('buyers').findOne({ id: userId }, { projection: { name: 1, email: 1 } }),
    ]);
    return NextResponse.json({ client: client ? { name: client.name, email: client.email } : null, events: events.map(event => ({ id: String(event._id), action: event.action, targetType: event.targetType, targetLabel: event.targetLabel, carId: event.carId, carLabel: event.carLabel, vendorId: event.vendorId, vendorName: event.vendorName, createdAt: event.createdAt })) });
  } catch { return NextResponse.json({ error: 'User history is temporarily unavailable.' }, { status: 503 }); }
}
