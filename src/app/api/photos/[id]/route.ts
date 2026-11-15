import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { isAdminRequest, isVendorSession } from '../../../../server/auth';
import { getDb, getPhotoBucket } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  try {
    const bucket = await getPhotoBucket();
    const fileId = new ObjectId(id);
    const [file] = await bucket.find({ _id: fileId }).limit(1).toArray();
    if (!file) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    const stream = bucket.openDownloadStream(fileId);
    const contentType = typeof file.metadata?.contentType === 'string' ? file.metadata.contentType : 'application/octet-stream';
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: { 'Content-Type': contentType, 'Content-Length': String(file.length), 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return NextResponse.json({ error: 'Photo storage is temporarily unavailable.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const admin = isAdminRequest(request);
  const vendor = isVendorSession(request);
  if (!admin && !vendor) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid photo id.' }, { status: 400 });
  try {
    const bucket = await getPhotoBucket();
    const fileId = new ObjectId(id);
    const [file] = await bucket.find({ _id: fileId }).limit(1).toArray();
    if (!file) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    if (vendor && file.metadata?.vendorId !== vendor.vendorId) {
      return NextResponse.json({ error: 'Unauthorized to delete this photo.' }, { status: 403 });
    }
    await bucket.delete(fileId);

    // Remove references from cars collection
    const db = await getDb();
    await db.collection('cars').updateMany(
      { $or: [{ photoIds: id }, { imageId: id }] },
      {
        $pull: { photoIds: id } as any,
        $set: { updatedAt: new Date() }
      }
    );

    // If deleted photo was primary imageId, reassign to next available
    const affectedCars = await db.collection('cars').find({ imageId: id }).toArray();
    for (const car of affectedCars) {
      const remaining = Array.isArray(car.photoIds) ? (car.photoIds as string[]).filter(pid => pid !== id) : [];
      const nextId = remaining[0] || '';
      await db.collection('cars').updateOne(
        { _id: car._id },
        {
          $set: {
            imageId: nextId || undefined,
            image: nextId ? `/api/photos/${nextId}` : (car.image && !String(car.image).includes(id) ? car.image : '/images/kars21-hero.png'),
            updatedAt: new Date()
          }
        }
      );
    }

    return NextResponse.json({ ok: true, deletedId: id });
  } catch {
    return NextResponse.json({ error: 'Failed to delete photo from storage.' }, { status: 500 });
  }
}
