import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/mongodb';
import { getSession } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);

    if (!body || !body.amount) {
      return NextResponse.json({ error: 'Please specify a bid amount.' }, { status: 400 });
    }

    const bidAmount = Number(body.amount);
    const bidderName = String(body.bidderName || '').trim() || 'Verified Dealer';
    const bidderPhone = String(body.bidderPhone || '').trim();

    const db = await getDb();
    const auction = await db.collection('auctions').findOne({ id });

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }

    if (auction.status !== 'live') {
      return NextResponse.json({ error: `Cannot place bid. This auction is ${auction.status}.` }, { status: 400 });
    }

    const now = Date.now();
    const endsAtTime = new Date(auction.schedule?.endsAt).getTime();

    if (now > endsAtTime) {
      // Mark as completed
      await db.collection('auctions').updateOne(
        { id },
        { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
      );
      return NextResponse.json({ error: 'Auction bidding has closed.' }, { status: 400 });
    }

    const currentBid = Number(auction.pricing?.currentBid) || Number(auction.pricing?.startingPrice) || 0;
    const minIncrement = Number(auction.pricing?.minIncrement) || 5000;
    const minRequiredBid = currentBid + minIncrement;

    if (bidAmount < minRequiredBid) {
      return NextResponse.json({
        error: `Bid must be at least ₹ ${minRequiredBid.toLocaleString('en-IN')} (Minimum increment is ₹ ${minIncrement.toLocaleString('en-IN')}).`,
      }, { status: 400 });
    }

    // Anti-sniping: If bid placed within last 2 minutes, add 60 seconds
    let newEndsAt = auction.schedule?.endsAt;
    if (endsAtTime - now < 120 * 1000) {
      newEndsAt = new Date(endsAtTime + 60 * 1000).toISOString();
    }

    const bidId = `bid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBid = {
      id: bidId,
      bidderName,
      bidderPhone: bidderPhone || undefined,
      amount: bidAmount,
      timestamp: new Date().toISOString(),
      isLeading: true,
    };

    // Update existing bids to not leading, and prepend new bid
    const existingBids = Array.isArray(auction.bids) ? auction.bids.map((b: any) => ({ ...b, isLeading: false })) : [];
    const updatedBids = [newBid, ...existingBids].slice(0, 50);

    await db.collection('auctions').updateOne(
      { id },
      {
        $set: {
          'pricing.currentBid': bidAmount,
          'pricing.totalBids': (Number(auction.pricing?.totalBids) || 0) + 1,
          'schedule.endsAt': newEndsAt,
          bids: updatedBids,
          updatedAt: new Date().toISOString(),
        }
      }
    );

    const updatedDoc = await db.collection('auctions').findOne({ id });
    const { _id, ...rest } = updatedDoc!;

    return NextResponse.json({
      success: true,
      auction: { ...rest, id: rest.id || _id.toString() },
      message: `Your bid of ₹ ${bidAmount.toLocaleString('en-IN')} is now the highest leading bid!`,
    });
  } catch (err) {
    console.error('Failed to place bid:', err);
    return NextResponse.json({ error: 'Failed to process bid. Please try again.' }, { status: 500 });
  }
}

