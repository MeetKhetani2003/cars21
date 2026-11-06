import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/mongodb';
import { getSession } from '@/server/auth';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type AuctionRecord = {
  id: string;
  auctionNumber: string;
  title: string;
  auctionType: 'online' | 'offline' | 'hybrid';
  // Offline / Physical Yard Venue Details
  venue?: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    googleMapsUrl?: string;
    gateEntryTiming?: string;
    coordinatorName?: string;
    coordinatorPhone?: string;
  };
  // Vehicle Details
  vehicle: {
    carId?: string;
    make: string;
    model: string;
    variant: string;
    year: number;
    registration: string;
    km: number;
    fuel: string;
    transmission: string;
    city: string;
    conditionScore: number; // 0-100
    image: string;
    photoIds?: string[];
    rcVerified: boolean;
  };
  // Pricing & Bidding Rules
  pricing: {
    startingPrice: number;
    reservePrice: number;
    currentBid: number;
    minIncrement: number;
    totalBids: number;
  };
  // Schedule & Duration
  schedule: {
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
  };
  // Status: upcoming | live | completed | cancelled
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  // Winner Details (when completed)
  winner?: {
    name: string;
    phone: string;
    dealerName?: string;
    winningPrice: number;
    completedAt: string;
  } | null;
  // Live Bids History
  bids: Array<{
    id: string;
    bidderName: string;
    bidderPhone?: string;
    amount: number;
    timestamp: string;
    isLeading: boolean;
  }>;
  organizedBy?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
};

// Seed initial realistic demo auctions if collection is empty
function getDemoAuctions(): AuctionRecord[] {
  const now = Date.now();
  return [
    {
      id: 'auc_junagadh_01',
      auctionNumber: 'AUC-2026-1048',
      title: 'Junagadh Saurashtra Premium SUV B2B Auction',
      auctionType: 'offline',
      venue: {
        name: 'Cars21 Central Yard & Delivery Hub',
        address: 'Plot No. 12/B, Junagadh-Rajkot National Highway, Near Bhesan Cross Road',
        city: 'Junagadh',
        state: 'Gujarat',
        pincode: '362001',
        landmark: 'Opposite Agricultural University Research Farm',
        googleMapsUrl: 'https://maps.google.com/?q=Junagadh+Gujarat',
        gateEntryTiming: 'Gate pass & physical vehicle inspection: 09:30 AM to 11:30 AM. Live hammer bidding begins at 12:00 PM.',
        coordinatorName: 'Kishorebhai Bhalodia',
        coordinatorPhone: '+91 98251 44556',
      },
      vehicle: {
        make: 'Hyundai',
        model: 'Creta',
        variant: 'SX (O) 1.5 Diesel Automatic',
        year: 2023,
        registration: 'GJ 11 AB 4589',
        km: 26500,
        fuel: 'Diesel',
        transmission: 'Automatic',
        city: 'Junagadh',
        conditionScore: 92,
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
        rcVerified: true,
      },
      pricing: {
        startingPrice: 1250000,
        reservePrice: 1380000,
        currentBid: 1425000,
        minIncrement: 10000,
        totalBids: 18,
      },
      schedule: {
        startsAt: new Date(now - 1000 * 60 * 45).toISOString(),
        endsAt: new Date(now + 1000 * 60 * 75).toISOString(),
        durationMinutes: 120,
      },
      status: 'live',
      winner: null,
      bids: [
        { id: 'b1', bidderName: 'Saurashtra Auto Hub (Junagadh)', amount: 1425000, timestamp: new Date(now - 1000 * 45).toISOString(), isLeading: true },
        { id: 'b2', bidderName: 'Gondal Premium Wheels', amount: 1415000, timestamp: new Date(now - 1000 * 180).toISOString(), isLeading: false },
        { id: 'b3', bidderName: 'Patel Cars Rajkot', amount: 1395000, timestamp: new Date(now - 1000 * 450).toISOString(), isLeading: false },
        { id: 'b4', bidderName: 'Gir Somnath Motors', amount: 1380000, timestamp: new Date(now - 1000 * 900).toISOString(), isLeading: false },
      ],
      createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      updatedAt: new Date(now - 1000 * 45).toISOString(),
    },
    {
      id: 'auc_online_02',
      auctionNumber: 'AUC-2026-1049',
      title: 'Gujarat High-Demand EV & Compact Sedan Digital Auction',
      auctionType: 'online',
      vehicle: {
        make: 'Tata',
        model: 'Nexon EV',
        variant: 'Empowered Plus 40.5 kWh Long Range',
        year: 2023,
        registration: 'GJ 03 EK 3344',
        km: 19800,
        fuel: 'Electric',
        transmission: 'Automatic',
        city: 'Rajkot',
        conditionScore: 94,
        image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80',
        rcVerified: true,
      },
      pricing: {
        startingPrice: 1100000,
        reservePrice: 1250000,
        currentBid: 1290000,
        minIncrement: 5000,
        totalBids: 24,
      },
      schedule: {
        startsAt: new Date(now - 1000 * 60 * 90).toISOString(),
        endsAt: new Date(now + 1000 * 60 * 150).toISOString(),
        durationMinutes: 240,
      },
      status: 'live',
      winner: null,
      bids: [
        { id: 'b21', bidderName: 'Apex Wheels Ahmedabad', amount: 1290000, timestamp: new Date(now - 1000 * 60).toISOString(), isLeading: true },
        { id: 'b22', bidderName: 'Kathiyawad EV Plaza (Rajkot)', amount: 1285000, timestamp: new Date(now - 1000 * 140).toISOString(), isLeading: false },
        { id: 'b23', bidderName: 'Bhavnagar Prime Motors', amount: 1270000, timestamp: new Date(now - 1000 * 300).toISOString(), isLeading: false },
      ],
      createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      updatedAt: new Date(now - 1000 * 60).toISOString(),
    },
    {
      id: 'auc_offline_03_completed',
      auctionNumber: 'AUC-2026-1042',
      title: 'Ahmedabad S.G. Highway Physical Yard Live Lot',
      auctionType: 'offline',
      venue: {
        name: 'Cars21 West Ahmedabad Auction Yard',
        address: 'B/h Iscon Mega Mall, S.G. Highway, Bodakdev',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380054',
        landmark: 'Near Iscon Cross Roads',
        googleMapsUrl: 'https://maps.google.com/?q=Ahmedabad+Gujarat',
        gateEntryTiming: 'Yard inspection concluded at 02:00 PM.',
        coordinatorName: 'Bhavin Shah',
        coordinatorPhone: '+91 98791 22334',
      },
      vehicle: {
        make: 'Mahindra',
        model: 'Thar',
        variant: 'LX 4-Wheel Drive Hard Top Diesel',
        year: 2022,
        registration: 'GJ 01 DF 9922',
        km: 24000,
        fuel: 'Diesel',
        transmission: 'Manual',
        city: 'Ahmedabad',
        conditionScore: 90,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
        rcVerified: true,
      },
      pricing: {
        startingPrice: 1150000,
        reservePrice: 1280000,
        currentBid: 1365000,
        minIncrement: 10000,
        totalBids: 31,
      },
      schedule: {
        startsAt: new Date(now - 1000 * 60 * 60 * 28).toISOString(),
        endsAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
        durationMinutes: 120,
      },
      status: 'completed',
      winner: {
        name: 'Mansukhbhai Patel',
        phone: '98250 88990',
        dealerName: 'Maruti TrueValue Associate (Junagadh)',
        winningPrice: 1365000,
        completedAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
      },
      bids: [
        { id: 'b31', bidderName: 'Maruti TrueValue Associate (Junagadh)', amount: 1365000, timestamp: new Date(now - 1000 * 60 * 60 * 26).toISOString(), isLeading: true },
        { id: 'b32', bidderName: 'Royal Auto Syndicate (Surat)', amount: 1355000, timestamp: new Date(now - 1000 * 60 * 60 * 26.2).toISOString(), isLeading: false },
      ],
      createdAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
    },
    {
      id: 'auc_offline_04_completed',
      auctionNumber: 'AUC-2026-1039',
      title: 'Rajkot Saurashtra Wholesale Physical Yard Lot',
      auctionType: 'offline',
      venue: {
        name: 'Cars21 Rajkot Yard 1',
        address: 'Opposite Crystal Mall, Kalawad Road',
        city: 'Rajkot',
        state: 'Gujarat',
        pincode: '360005',
        landmark: 'Kalawad Highway',
        gateEntryTiming: 'Completed on Sunday',
        coordinatorName: 'Mayursinh Jadeja',
        coordinatorPhone: '+91 94282 11223',
      },
      vehicle: {
        make: 'Maruti Suzuki',
        model: 'Grand Vitara',
        variant: 'Alpha Strong Hybrid e-CVT',
        year: 2023,
        registration: 'GJ 03 KL 8181',
        km: 18200,
        fuel: 'Hybrid',
        transmission: 'Automatic',
        city: 'Rajkot',
        conditionScore: 95,
        image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80',
        rcVerified: true,
      },
      pricing: {
        startingPrice: 1400000,
        reservePrice: 1520000,
        currentBid: 1610000,
        minIncrement: 10000,
        totalBids: 22,
      },
      schedule: {
        startsAt: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
        endsAt: new Date(now - 1000 * 60 * 60 * 50).toISOString(),
        durationMinutes: 120,
      },
      status: 'completed',
      winner: {
        name: 'Ghanshyam Dave',
        phone: '98242 55667',
        dealerName: 'Girnar Motors (Junagadh)',
        winningPrice: 1610000,
        completedAt: new Date(now - 1000 * 60 * 60 * 50).toISOString(),
      },
      bids: [
        { id: 'b41', bidderName: 'Girnar Motors (Junagadh)', amount: 1610000, timestamp: new Date(now - 1000 * 60 * 60 * 50).toISOString(), isLeading: true },
      ],
      createdAt: new Date(now - 1000 * 60 * 60 * 56).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 50).toISOString(),
    }
  ];
}

// GET: Retrieve auctions with filtering and metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';
    const typeFilter = searchParams.get('type') || 'all';
    const cityFilter = searchParams.get('city') || 'all';

    const db = await getDb();
    const collection = db.collection('auctions');
    const count = await collection.countDocuments();

    if (count === 0) {
      const demoData = getDemoAuctions();
      await collection.insertMany(demoData.map(item => ({ ...item, _id: new ObjectId() })));
    }

    const query: Record<string, any> = {};
    if (statusFilter !== 'all') query.status = statusFilter;
    if (typeFilter !== 'all') query.auctionType = typeFilter;
    if (cityFilter !== 'all') {
      query.$or = [
        { 'vehicle.city': { $regex: new RegExp(`^${cityFilter}$`, 'i') } },
        { 'venue.city': { $regex: new RegExp(`^${cityFilter}$`, 'i') } }
      ];
    }

    const docs = await collection.find(query).sort({ 'schedule.startsAt': -1 }).toArray();

    const auctions: AuctionRecord[] = docs.map(doc => {
      const { _id, ...rest } = doc;
      return {
        ...rest,
        id: rest.id || _id.toString(),
      } as AuctionRecord;
    });

    // Automatically transition auctions whose time has expired to completed
    const now = Date.now();
    for (const auc of auctions) {
      if (auc.status === 'live' && new Date(auc.schedule.endsAt).getTime() <= now) {
        // Conclude auction
        const highestBid = auc.bids?.[0];
        const winner = highestBid ? {
          name: highestBid.bidderName,
          phone: highestBid.bidderPhone || 'Verified Dealer',
          winningPrice: highestBid.amount,
          completedAt: new Date().toISOString(),
        } : null;

        await collection.updateOne(
          { id: auc.id },
          { $set: { status: 'completed', winner, updatedAt: new Date().toISOString() } }
        );
        auc.status = 'completed';
        auc.winner = winner;
      }
    }

    const allDocs = await collection.find({}).toArray();
    const allAuctions = allDocs.map((doc: any) => ({ ...doc, id: doc.id || doc._id.toString() })) as AuctionRecord[];

    const liveAuctions = allAuctions.filter(a => a.status === 'live');
    const upcomingAuctions = allAuctions.filter(a => a.status === 'upcoming');
    const recentCompleted = allAuctions
      .filter(a => a.status === 'completed' && a.winner)
      .sort((a, b) => new Date(b.winner?.completedAt || b.schedule.endsAt).getTime() - new Date(a.winner?.completedAt || a.schedule.endsAt).getTime());

    const metrics = {
      total: allAuctions.length,
      liveCount: liveAuctions.length,
      upcomingCount: upcomingAuctions.length,
      completedCount: recentCompleted.length,
      totalVolumeTransacted: recentCompleted.reduce((sum, a) => sum + (a.winner?.winningPrice || 0), 0),
      highestWinningBid: recentCompleted.length ? Math.max(...recentCompleted.map(a => a.winner?.winningPrice || 0)) : 0,
    };

    return NextResponse.json({
      auctions,
      liveAuctions,
      upcomingAuctions,
      recentCompleted,
      metrics,
    });
  } catch (err) {
    console.error('Failed to get auctions:', err);
    return NextResponse.json({ error: 'Failed to retrieve auctions.' }, { status: 500 });
  }
}

// POST: Superadmin / Admin organizes a new Online or Offline auction
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || (session.role !== 'superadmin' && session.role !== 'manager' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Only administrators and managers can organize an auction.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid auction payload.' }, { status: 400 });
    }

    const {
      title,
      auctionType = 'online',
      venue,
      vehicle,
      pricing,
      schedule,
    } = body;

    if (!title || !vehicle?.make || !vehicle?.model || !pricing?.startingPrice) {
      return NextResponse.json({ error: 'Title, vehicle make/model, and starting price are required.' }, { status: 400 });
    }

    // If offline, address and city must be provided
    if (auctionType === 'offline' && (!venue?.address || !venue?.city)) {
      return NextResponse.json({ error: 'Offline auctions require physical venue address and city.' }, { status: 400 });
    }

    const now = new Date();
    const durationMinutes = Number(schedule?.durationMinutes) || 120;
    const startsAt = schedule?.startsAt ? new Date(schedule.startsAt).toISOString() : now.toISOString();
    const endsAt = schedule?.endsAt
      ? new Date(schedule.endsAt).toISOString()
      : new Date(new Date(startsAt).getTime() + durationMinutes * 60 * 1000).toISOString();

    const status = new Date(startsAt).getTime() <= now.getTime() ? 'live' : 'upcoming';

    const id = `auc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const auctionNumber = `AUC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAuction: AuctionRecord = {
      id,
      auctionNumber,
      title: title.trim(),
      auctionType,
      venue: auctionType === 'offline' || auctionType === 'hybrid' ? {
        name: venue?.name || 'Cars21 Certified Yard',
        address: venue?.address || '',
        city: venue?.city || 'Junagadh',
        state: venue?.state || 'Gujarat',
        pincode: venue?.pincode || '362001',
        landmark: venue?.landmark || '',
        googleMapsUrl: venue?.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent((venue?.address || '') + ' ' + (venue?.city || 'Junagadh'))}`,
        gateEntryTiming: venue?.gateEntryTiming || 'Vehicle physical inspection starts 2 hours prior to live auction.',
        coordinatorName: venue?.coordinatorName || session?.name || 'Yard Manager',
        coordinatorPhone: venue?.coordinatorPhone || '+91 98251 23456',
      } : undefined,
      vehicle: {
        carId: vehicle.carId || undefined,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant || 'Standard',
        year: Number(vehicle.year) || now.getFullYear(),
        registration: (vehicle.registration || 'UNREGISTERED').toUpperCase(),
        km: Number(vehicle.km) || 0,
        fuel: vehicle.fuel || 'Petrol',
        transmission: vehicle.transmission || 'Manual',
        city: vehicle.city || venue?.city || 'Junagadh',
        conditionScore: Number(vehicle.conditionScore) || 90,
        image: vehicle.image || '/images/kars21-hero.png',
        rcVerified: vehicle.rcVerified !== false,
      },
      pricing: {
        startingPrice: Number(pricing.startingPrice) || 500000,
        reservePrice: Number(pricing.reservePrice) || Number(pricing.startingPrice) || 500000,
        currentBid: Number(pricing.startingPrice) || 500000,
        minIncrement: Number(pricing.minIncrement) || 5000,
        totalBids: 0,
      },
      schedule: {
        startsAt,
        endsAt,
        durationMinutes,
      },
      status,
      winner: null,
      bids: [],
      organizedBy: {
        id: session?.sub || 'admin',
        name: session?.name || 'Superadmin',
        role: session?.role || 'superadmin',
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const db = await getDb();
    await db.collection('auctions').insertOne({ ...newAuction, _id: new ObjectId() });

    return NextResponse.json({
      success: true,
      auction: newAuction,
      message: `Auction "${newAuction.title}" successfully organized and published.`,
    }, { status: 201 });
  } catch (err) {
    console.error('Failed to organize auction:', err);
    return NextResponse.json({ error: 'Failed to organize auction.' }, { status: 500 });
  }
}
