import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/mongodb';
import { canManagerPerform, getSession } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const isSuper = session.role === 'superadmin';
    const isAdmin = session.role === 'admin';
    const isManager = session.role === 'manager';

    if (!isSuper && !isAdmin && !isManager) {
      return NextResponse.json({ error: 'Administrator or manager privileges required to publish listings.' }, { status: 403 });
    }

    if (isManager && !(await canManagerPerform(request, 'inquiries')) && !(await canManagerPerform(request, 'listings'))) {
      return NextResponse.json({ error: 'Manager is not granted permission to list vehicles.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const db = await getDb();

    const inquiry = await db.collection('sellInquiries').findOne({ id });
    if (!inquiry) {
      return NextResponse.json({ error: 'Sell inquiry not found.' }, { status: 404 });
    }

    // Check if already published
    const existing = await db.collection('cars').findOne({
      $or: [
        { listedFromInquiryId: id },
        { id: inquiry.listedCarId }
      ]
    });

    if (existing) {
      const existingId = String(existing.id || existing._id);
      return NextResponse.json({
        success: true,
        carId: existingId,
        car: { ...existing, id: existingId, _id: undefined },
        message: 'This vehicle is already listed in Cars21 inventory.',
        alreadyListed: true,
      });
    }

    // Generate clean slug ID
    const cleanMake = String(inquiry.vehicle?.make || 'car').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanModel = String(inquiry.vehicle?.model || 'model').toLowerCase().replace(/[^a-z0-9]/g, '');
    const year = Number(inquiry.vehicle?.purchaseYear || inquiry.vehicle?.mfgYear || new Date().getFullYear());
    const randSuffix = Math.random().toString(36).substring(2, 6);
    const carId = `${cleanMake}-${cleanModel}-${year}-${randSuffix}`;

    // Collect all uploaded photos
    const photoIds: string[] = [
      inquiry.media?.photoFrontId,
      inquiry.media?.photoBackId,
      inquiry.media?.photoLeftSideId,
      inquiry.media?.photoRightSideId,
      inquiry.media?.photoInteriorId,
      ...(Array.isArray(inquiry.media?.additionalPhotoIds) ? inquiry.media.additionalPhotoIds : [])
    ].filter(Boolean).map(String);

    const primaryPhotoId = inquiry.media?.photoFrontId || photoIds[0] || undefined;
    const image = primaryPhotoId ? `/api/photos/${encodeURIComponent(primaryPhotoId)}` : (inquiry.vehicle?.image || '/images/kars21-hero.png');

    const price = Number(
      body.overridePrice ||
      inquiry.pricing?.counterOffer ||
      inquiry.pricing?.expectedPrice ||
      inquiry.pricing?.estimatedMarketValue ||
      500000
    );

    const conditionScore = inquiry.vehicle?.condition === 'Excellent' ? 95
      : inquiry.vehicle?.condition === 'Good' ? 90
      : inquiry.vehicle?.condition === 'Fair' ? 84
      : 80;

    const isVerified = inquiry.documents?.verificationStatus === 'verified';
    const badge = body.badge || (isVerified ? 'Cars21 verified' : 'Cars21 listing');

    const carDoc: Record<string, unknown> = {
      id: carId,
      make: inquiry.vehicle?.make || 'Unknown',
      model: inquiry.vehicle?.model || 'Unknown',
      variant: inquiry.vehicle?.variant || 'Standard',
      year,
      km: Number(inquiry.vehicle?.km || 0),
      fuel: inquiry.vehicle?.fuel || 'Petrol',
      transmission: inquiry.vehicle?.transmission || 'Manual',
      owners: Number(inquiry.vehicle?.owners || 1),
      price,
      city: inquiry.seller?.city || 'Junagadh',
      area: inquiry.seller?.address || '',
      body: inquiry.vehicle?.bodyType || 'SUV',
      color: inquiry.vehicle?.color || 'White',
      score: conditionScore,
      badge,
      image,
      imageId: primaryPhotoId,
      photoIds,
      documentPhotoId: inquiry.documents?.rcBookPhotoId || undefined,
      documentNumber: inquiry.vehicle?.registration || undefined,
      documentType: 'RC / Registration Certificate',
      verificationStatus: inquiry.documents?.verificationStatus || 'unverified',
      verificationNote: inquiry.documents?.verificationNotes || undefined,
      verifiedBy: isVerified ? { id: session.sub, name: session.name, role: session.role, at: new Date() } : undefined,
      sellerName: inquiry.seller?.name || 'Private Seller',
      sellerPhone: inquiry.seller?.phone || undefined,
      sellerWhatsApp: inquiry.seller?.phone || undefined,
      status: body.status || 'active',
      listedFromInquiryId: id,
      listedBy: {
        id: session.sub,
        name: session.name,
        role: session.role,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('cars').insertOne(carDoc);

    // Update sell inquiry with reference to listed car
    await db.collection('sellInquiries').updateOne(
      { id },
      {
        $set: {
          listedCarId: carId,
          updatedAt: new Date().toISOString(),
          ...(inquiry.status === 'new' || inquiry.status === 'contacted' ? { status: 'purchased' } : {})
        }
      }
    );

    return NextResponse.json({
      success: true,
      carId,
      car: { ...carDoc, _id: undefined },
      message: `✓ ${year} ${carDoc.make} ${carDoc.model} successfully published to Cars21 inventory!`,
    });
  } catch (err: any) {
    console.error('Failed to publish car listing from sell inquiry:', err);
    return NextResponse.json({ error: err.message || 'Failed to publish listing.' }, { status: 500 });
  }
}
