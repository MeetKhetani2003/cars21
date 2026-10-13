import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getPhotoBucket } from '../../../../server/mongodb';

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
