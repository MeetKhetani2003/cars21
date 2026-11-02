import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest, getSession } from '@/server/auth';
import { getDb } from '@/server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin access required to view loan applications.' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const collection = db.collection('loan_applications');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase();

    const filter: Record<string, any> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { applicationNumber: { $regex: search, $options: 'i' } },
        { 'applicant.name': { $regex: search, $options: 'i' } },
        { 'applicant.mobile': { $regex: search, $options: 'i' } },
        { 'applicant.email': { $regex: search, $options: 'i' } },
        { 'applicant.panNumber': { $regex: search, $options: 'i' } },
        { 'applicant.aadhaarNumber': { $regex: search, $options: 'i' } },
        { 'car.make': { $regex: search, $options: 'i' } },
        { 'car.model': { $regex: search, $options: 'i' } },
        { 'applicant.address.city': { $regex: search, $options: 'i' } },
      ];
    }

    const applications = await collection.find(filter).sort({ createdAt: -1 }).limit(300).toArray();

    // Calculate metrics
    const all = await collection.find({}).project({ status: 1, 'loanDetails.loanAmount': 1 }).toArray();
    const metrics = {
      total: all.length,
      new: all.filter(a => a.status === 'new').length,
      underReview: all.filter(a => a.status === 'under_review').length,
      documentsVerified: all.filter(a => a.status === 'documents_verified').length,
      approved: all.filter(a => a.status === 'approved').length,
      disbursed: all.filter(a => a.status === 'disbursed').length,
      rejected: all.filter(a => a.status === 'rejected').length,
      totalVolume: all.reduce((sum, a) => sum + (Number(a.loanDetails?.loanAmount) || 0), 0),
    };

    return NextResponse.json({
      loans: applications.map(app => ({
        ...app,
        _id: String(app._id),
      })),
      metrics,
    });
  } catch (error) {
    console.error('Error fetching loan applications:', error);
    return NextResponse.json({ error: 'Could not load loan applications.' }, { status: 500 });
  }
}

