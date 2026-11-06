import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { canManagerPerform, isManagerRequest, isSuperAdminRequest } from '../../../../../server/auth';
import { getDb, getPhotoBucket } from '../../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
type CarPhotoReferences = { imageId?: string; photoIds?: string[]; inspection?: { evidencePhotoIds?: string[] } };
type VendorPhotoReferences = { logoPhotoId?: string; coverPhotoId?: string; shopPhotoIds?: string[] };

export async function DELETE(request: NextRequest, context: Context) {
  const isSuper = isSuperAdminRequest(request);
  const isMgr = isManagerRequest(request);
  if (!isSuper && !isMgr) return NextResponse.json({ error: 'Management access required.' }, { status: 403 });
  if (isMgr) {
    const hasPhotos = await canManagerPerform(request, 'photos');
    const hasDelete = await canManagerPerform(request, 'canDelete');
    if (!hasPhotos || !hasDelete) return NextResponse.json({ error: 'Manager account does not have permission to delete media photos.' }, { status: 403 });
  }
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  try {
    await (await getPhotoBucket()).delete(new ObjectId(id));
    const db = await getDb();
    await Promise.all([
      db.collection<CarPhotoReferences>('cars').updateMany({ imageId: id }, { $unset: { imageId: '' } }),
      db.collection<CarPhotoReferences>('cars').updateMany({ photoIds: id }, { $pull: { photoIds: id } }),
      db.collection<CarPhotoReferences>('cars').updateMany({ 'inspection.evidencePhotoIds': id }, { $pull: { 'inspection.evidencePhotoIds': id } }),
      db.collection<VendorPhotoReferences>('vendors').updateMany({ logoPhotoId: id }, { $unset: { logoPhotoId: '' } }),
      db.collection<VendorPhotoReferences>('vendors').updateMany({ coverPhotoId: id }, { $unset: { coverPhotoId: '' } }),
      db.collection<VendorPhotoReferences>('vendors').updateMany({ shopPhotoIds: id }, { $pull: { shopPhotoIds: id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Photo could not be deleted.' }, { status: 404 }); }
}
