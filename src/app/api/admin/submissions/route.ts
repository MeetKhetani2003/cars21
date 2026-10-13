import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    const db = await getDb();
    const [sellerLeads, dealerApplications] = await Promise.all([
      db.collection<Record<string, unknown>>('sellerLeads').find({}).sort({ createdAt: -1 }).limit(300).toArray(),
      db.collection<Record<string, unknown>>('dealerApplications').find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    ]);
    const clean = (items: Record<string, unknown>[], type: 'seller' | 'dealer'): Record<string, unknown>[] => items.map(item => ({ ...item, type, id: String(item.id ?? item._id), _id: undefined }));
    return NextResponse.json({ submissions: [...clean(sellerLeads, 'seller'), ...clean(dealerApplications, 'dealer')].sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()) });
  } catch { return NextResponse.json({ error: 'Website submissions are temporarily unavailable.' }, { status: 503 }); }
}
