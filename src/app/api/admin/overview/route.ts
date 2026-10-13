import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../server/auth';
import { ensureDevelopmentDemoInventory } from '../../../../server/demo-inventory';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  try {
    const db = await getDb();
    await ensureDevelopmentDemoInventory();
    const cars = db.collection('cars');
    const inquiries = db.collection('inquiries');
    const vendors = db.collection('vendors');
    const [totalCars, activeCars, pendingCars, totalVendors, activeVendors, totalInquiries, newInquiries, recent, recentVendors, inquiryDates] = await Promise.all([
      cars.countDocuments(), cars.countDocuments({ $or: [{ status: 'active' }, { status: { $exists: false } }] }), cars.countDocuments({ status: 'pending' }),
      vendors.countDocuments(), vendors.countDocuments({ status: 'active' }), inquiries.countDocuments(), inquiries.countDocuments({ status: 'new' }),
      inquiries.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
      vendors.find({}).sort({ createdAt: -1 }).limit(5).project({ id: 1, name: 1, businessName: 1, city: 1, status: 1, createdAt: 1 }).toArray(),
      inquiries.find({ createdAt: { $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } }).project({ createdAt: 1 }).toArray(),
    ]);
    const activity = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
      const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1);
      return { date: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date), count: inquiryDates.filter(item => item.createdAt instanceof Date && item.createdAt >= date && item.createdAt < nextDate).length };
    });
    return NextResponse.json({
      metrics: { totalCars, activeCars, pendingCars, totalVendors, activeVendors, totalInquiries, newInquiries },
      recent: recent.map(item => ({ ...item, id: item._id.toString(), _id: undefined })),
      recentVendors: recentVendors.map(item => ({ ...item, id: String(item.id ?? item._id), _id: undefined })),
      activity,
      updatedAt: new Date().toISOString(),
    });
  } catch { return NextResponse.json({ error: 'Dashboard data is temporarily unavailable.' }, { status: 503 }); }
}
