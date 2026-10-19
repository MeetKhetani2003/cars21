import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isVendorSession } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';
import { vendorSlug } from '../../../../lib/vendor-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  businessName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(24),
  inquiryEmail: z.string().trim().email().max(160),
  inquiryWhatsApp: z.string().trim().min(8).max(24).regex(/^\+?[\d\s()-]+$/),
  city: z.string().trim().min(2).max(80),
  area: z.string().trim().max(120).optional().default(''),
  address: z.string().trim().max(240).optional().default(''),
  description: z.string().trim().max(1200).optional().default(''),
  website: z.string().trim().max(240).optional().default('').refine(value => !value || /^https?:\/\//i.test(value), 'Enter a website starting with https://.'),
  workingHours: z.string().trim().max(160).optional().default(''),
  establishedYear: z.union([z.number().int().min(1900).max(2100), z.literal(''), z.null()]).optional().transform(value => value === '' || value == null ? null : Number(value)),
  specialties: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  logoPhotoId: z.string().max(80).optional().default(''),
  coverPhotoId: z.string().max(80).optional().default(''),
  shopPhotoIds: z.array(z.string().max(80)).max(8).optional().default([]),
});

export async function PATCH(request: NextRequest) {
  const session = isVendorSession(request);
  if (!session?.vendorId) return NextResponse.json({ error: 'Vendor sign-in required.' }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Check the business details and try again.' }, { status: 400 });
  try {
    const db = await getDb();
    const result = await db.collection<Record<string, unknown>>('vendors').updateOne(
      { id: session.vendorId, status: 'active' },
      { $set: { ...parsed.data, slug: vendorSlug(parsed.data.businessName, session.vendorId), updatedAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: 'This vendor account is suspended or no longer exists.' }, { status: 403 });
    return NextResponse.json({ ok: true, profileUrl: `/dealers/${vendorSlug(parsed.data.businessName, session.vendorId)}`, profile: parsed.data });
  } catch { return NextResponse.json({ error: 'Business profile could not be saved.' }, { status: 503 }); }
}
