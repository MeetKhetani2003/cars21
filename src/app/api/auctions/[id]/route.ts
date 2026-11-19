import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/mongodb';
import { canManagerPerform, getSession } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// GET single auction
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    const doc = await db.collection('auctions').findOne({ id });

    if (!doc) {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }

    const { _id, ...rest } = doc;
    return NextResponse.json({ auction: { ...rest, id: rest.id || _id.toString() } });
  } catch (err) {
    console.error('Failed to get auction:', err);
    return NextResponse.json({ error: 'Failed to retrieve auction.' }, { status: 500 });
  }
}

// PATCH: Update status, declare winner, or conclude auction
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = getSession(request);
    if (!session || (session.role !== 'superadmin' && session.role !== 'manager' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const updateFields: Record<string, any> = { updatedAt: new Date().toISOString() };

    const db = await getDb();
    const existing = await db.collection('auctions').findOne({ id });
    if (!existing) {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }

    if (body.status) {
      updateFields.status = body.status;
    }

    if (body.vehicle) {
      updateFields.vehicle = body.vehicle;
    }

    if (body.title) {
      updateFields.title = String(body.title).trim();
    }

    if (body.auctionType) {
      updateFields.auctionType = body.auctionType;
    }

    if (body.venue) {
      updateFields.venue = body.venue;
    }

    // Extend auction duration support
    if (typeof body.extendMinutes === 'number' && body.extendMinutes > 0) {
      const currentEndsAtMs = existing.schedule?.endsAt ? new Date(existing.schedule.endsAt).getTime() : Date.now();
      const baseMs = Math.max(Date.now(), currentEndsAtMs);
      const newEndsAt = new Date(baseMs + body.extendMinutes * 60 * 1000).toISOString();
      updateFields['schedule.endsAt'] = newEndsAt;
      const prevDuration = Number(existing.schedule?.durationMinutes) || 0;
      updateFields['schedule.durationMinutes'] = prevDuration + body.extendMinutes;

      // If it was completed or cancelled, reactivate to live
      if (existing.status === 'completed' || existing.status === 'cancelled') {
        updateFields.status = 'live';
      }
    }

    // Declare winner explicitly
    if (body.winner) {
      updateFields.winner = {
        name: String(body.winner.name || '').trim(),
        phone: String(body.winner.phone || '').trim(),
        dealerName: body.winner.dealerName ? String(body.winner.dealerName).trim() : undefined,
        winningPrice: Number(body.winner.winningPrice) || 0,
        completedAt: new Date().toISOString(),
      };
      updateFields.status = 'completed';
    }

    if (body.pricing) {
      if (body.pricing.reservePrice !== undefined) updateFields['pricing.reservePrice'] = Number(body.pricing.reservePrice);
      if (body.pricing.minIncrement !== undefined) updateFields['pricing.minIncrement'] = Number(body.pricing.minIncrement);
    }

    if (body.schedule) {
      if (body.schedule.endsAt) updateFields['schedule.endsAt'] = new Date(body.schedule.endsAt).toISOString();
      if (body.schedule.durationMinutes !== undefined) updateFields['schedule.durationMinutes'] = Number(body.schedule.durationMinutes);
      if (body.schedule.startsAt) updateFields['schedule.startsAt'] = new Date(body.schedule.startsAt).toISOString();
    }

    const result = await db.collection('auctions').updateOne(
      { id },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }

    const updated = await db.collection('auctions').findOne({ id });
    const { _id, ...rest } = updated!;
    const auctionDoc: any = { ...rest, id: (rest as any).id || _id.toString() };

    // Link car in cars collection if linked with carId
    const targetCarId = body.vehicle?.carId || existing.vehicle?.carId;
    if (targetCarId) {
      await db.collection('cars').updateOne(
        { id: targetCarId },
        {
          $set: {
            auctionId: id,
            auctionNumber: auctionDoc.auctionNumber,
            inAuction: auctionDoc.status === 'live' || auctionDoc.status === 'upcoming',
            auctionStatus: auctionDoc.status,
            updatedAt: new Date()
          }
        }
      );
    }

    // Link sell inquiry in sellInquiries collection if linked with inquiryId
    const targetInquiryId = body.vehicle?.inquiryId || existing.vehicle?.inquiryId;
    if (targetInquiryId) {
      await db.collection('sellInquiries').updateOne(
        { id: targetInquiryId },
        {
          $set: {
            auctionId: id,
            auctionNumber: auctionDoc.auctionNumber,
            inAuction: auctionDoc.status === 'live' || auctionDoc.status === 'upcoming',
            auctionStatus: auctionDoc.status,
            updatedAt: new Date().toISOString()
          }
        }
      );
    }

    return NextResponse.json({
      success: true,
      auction: auctionDoc,
      message: 'Auction updated successfully.',
    });
  } catch (err) {
    console.error('Failed to update auction:', err);
    return NextResponse.json({ error: 'Failed to update auction.' }, { status: 500 });
  }
}

// DELETE: Delete auction (superadmin only, or authorized manager)
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = getSession(request);
    const isSuper = session?.role === 'superadmin';
    const isMgrAllowed = session?.role === 'manager' && (await canManagerPerform(request, 'auctions')) && (await canManagerPerform(request, 'canDelete'));
    if (!session || (!isSuper && !isMgrAllowed)) {
      return NextResponse.json({ error: 'Management access required to remove auctions.' }, { status: 403 });
    }

    const { id } = await context.params;
    const db = await getDb();
    const result = await db.collection('auctions').deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Auction deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete auction:', err);
    return NextResponse.json({ error: 'Failed to delete auction.' }, { status: 500 });
  }
}

