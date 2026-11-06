import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canManagerPerform, DEFAULT_MANAGER_PERMISSIONS, getSession, hashPassword, isAdminRequest, isManagerRequest, isSuperAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';
import { vendorSlug } from '../../../../lib/vendor-slug';
import { ensureDevelopmentDemoVendorProfile } from '../../../../server/demo-vendor';
import { requestGoogleIndexing } from '../../../../server/google-indexing';
import { getSiteOrigin } from '../../../../server/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const accountSchema = z.object({
  accountType: z.enum(['manager', 'admin', 'vendor']),
  name: z.string().trim().min(2, 'Name must have at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email address (e.g. name@domain.com)').max(160),
  businessName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  assignedAdminId: z.string().trim().optional(),
  assignedAdminName: z.string().trim().optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  password: z.union([
    z.string().trim().min(6, 'Password must have at least 6 characters').max(100),
    z.literal('')
  ]).optional(),
}).superRefine((data, ctx) => {
  if (data.accountType === 'vendor') {
    if (!data.businessName || data.businessName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Dealership name must have at least 2 characters', path: ['businessName'] });
    }
    if (!data.phone || data.phone.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone number is required (at least 5 characters)', path: ['phone'] });
    }
    if (!data.city || data.city.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'City is required', path: ['city'] });
    }
  }
});

export async function GET(request: NextRequest) {
  const isSuper = isSuperAdminRequest(request);
  const isMgr = isManagerRequest(request);
  if (!isSuper && !isMgr) {
    return NextResponse.json({ error: 'Management access required.' }, { status: 403 });
  }
  if (isMgr && !(await canManagerPerform(request, 'accounts'))) {
    return NextResponse.json({ error: 'Manager permissions do not include account management.' }, { status: 403 });
  }

  try {
    await ensureDevelopmentDemoVendorProfile();
    const db = await getDb();
    
    // Superadmin sees managers, admins, and vendors
    // Manager has access to all admins and all vendors (and all data!)
    const [managers, admins, vendors] = await Promise.all([
      isSuper ? db.collection<Record<string, unknown>>('managers').find({}).sort({ createdAt: -1 }).limit(100).toArray() : Promise.resolve([]),
      db.collection<Record<string, unknown>>('admins').find({}).sort({ createdAt: -1 }).limit(300).toArray(),
      db.collection<Record<string, unknown>>('vendors').find({}).sort({ createdAt: -1 }).limit(300).toArray(),
    ]);

    return NextResponse.json({ accounts: [
      ...managers.map(item => ({
        id: String(item.id ?? item._id),
        accountType: 'manager',
        name: item.name,
        email: item.email,
        phone: item.phone || '',
        status: item.status,
        permissions: item.permissions || DEFAULT_MANAGER_PERMISSIONS,
        createdAt: item.createdAt,
        addedBy: item.addedBy || null,
      })),
      ...admins.map(item => ({
        id: String(item.id ?? item._id),
        accountType: 'admin',
        name: item.name,
        email: item.email,
        phone: item.phone || '',
        status: item.status,
        createdAt: item.createdAt,
        addedBy: item.addedBy || null,
      })),
      ...vendors.map(item => {
        const id = String(item.id ?? item._id);
        const businessName = String(item.businessName ?? item.name ?? 'Dealer');
        return {
          id,
          accountType: 'vendor',
          name: item.name,
          businessName,
          email: item.email,
          inquiryEmail: item.inquiryEmail ?? item.email,
          inquiryWhatsApp: item.inquiryWhatsApp ?? item.phone,
          phone: item.phone,
          city: item.city,
          area: item.area ?? item.locality,
          address: item.address,
          description: item.description,
          website: item.website,
          workingHours: item.workingHours,
          establishedYear: item.establishedYear,
          specialties: item.specialties,
          logoPhotoId: item.logoPhotoId,
          coverPhotoId: item.coverPhotoId,
          shopPhotoIds: item.shopPhotoIds,
          status: item.status,
          createdAt: item.createdAt,
          profileUrl: `/dealers/${vendorSlug(businessName, id)}`,
          addedBy: item.addedBy || null,
          assignedAdminId: item.assignedAdminId || null,
          assignedAdminName: item.assignedAdminName || null,
        };
      }),
    ] });
  } catch { return NextResponse.json({ error: 'Accounts are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required to create accounts.' }, { status: 403 });
  const rawBody = await request.json().catch(() => null);
  const parsed = accountSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue ? issue.message : 'Check the account details and try again.';
    console.warn('User creation validation failure:', message, rawBody);
    return NextResponse.json({ error: message, issues: parsed.error.issues }, { status: 400 });
  }

  const accountType = parsed.data.accountType;
  if (accountType === 'manager' && !isSuperAdminRequest(request)) {
    return NextResponse.json({ error: 'Only superadmin can create manager accounts.' }, { status: 403 });
  }
  if (accountType === 'admin') {
    const isSuper = isSuperAdminRequest(request);
    const isMgr = isManagerRequest(request) && (await canManagerPerform(request, 'accounts'));
    if (!isSuper && !isMgr) {
      return NextResponse.json({ error: 'Superadmin or Manager privileges required to create administrator accounts.' }, { status: 403 });
    }
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const session = getSession(request);
    const db = await getDb();
    const managers = db.collection<Record<string, unknown>>('managers');
    const admins = db.collection<Record<string, unknown>>('admins');
    const vendors = db.collection<Record<string, unknown>>('vendors');
    await Promise.all([
      managers.createIndex({ email: 1 }, { unique: true }),
      admins.createIndex({ email: 1 }, { unique: true }),
      vendors.createIndex({ email: 1 }, { unique: true }),
    ]);

    if (await managers.findOne({ email }) || await admins.findOne({ email }) || await vendors.findOne({ email })) {
      return NextResponse.json({ error: 'An account already uses that email.' }, { status: 409 });
    }

    const customPassword = parsed.data.password && parsed.data.password.trim().length >= 6 ? parsed.data.password.trim() : null;
    const password = customPassword || randomBytes(12).toString('base64url');
    const { salt, hash } = await hashPassword(password);
    const id = randomBytes(12).toString('hex');

    const addedBy = {
      id: session?.sub || 'system',
      name: session?.name || (session?.role === 'superadmin' ? 'Super Admin' : session?.role === 'manager' ? 'Manager' : 'Admin'),
      email: session?.email || '',
      role: session?.role || 'admin',
    };
    const assignedAdminId = session?.role === 'admin' ? session.sub : (parsed.data.assignedAdminId || '');
    const assignedAdminName = session?.role === 'admin' ? session.name : (parsed.data.assignedAdminName || '');

    const values = {
      accountType,
      name: parsed.data.name,
      email,
      phone: parsed.data.phone || '',
      ...(accountType === 'vendor' ? {
        businessName: parsed.data.businessName || parsed.data.name,
        city: parsed.data.city || '',
        addedBy,
        assignedAdminId,
        assignedAdminName,
      } : accountType === 'manager' ? {
        permissions: { ...DEFAULT_MANAGER_PERMISSIONS, ...(parsed.data.permissions || {}) },
        addedBy,
      } : {
        addedBy,
      })
    };
    const vendorBusinessName = parsed.data.businessName || parsed.data.name;
    const account = {
      id,
      ...values,
      ...(accountType === 'vendor' ? { slug: vendorSlug(vendorBusinessName, id) } : {}),
      role: accountType,
      status: 'active',
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (accountType === 'manager') {
      await managers.insertOne(account);
    } else if (accountType === 'admin') {
      await admins.insertOne(account);
    } else {
      await vendors.insertOne(account);
    }

    // Auto-request Google Search Console indexing for newly added dealer
    if (accountType === 'vendor' && account.slug) {
      try {
        const siteUrl = await getSiteOrigin();
        if (siteUrl) {
          const dealerUrl = `${siteUrl}/dealers/${account.slug}`;
          void requestGoogleIndexing([
            dealerUrl,
            `${siteUrl}/dealers`,
            `${siteUrl}/dealers?city=${encodeURIComponent(parsed.data.city || 'Junagadh')}`,
          ], 'URL_UPDATED', `auto_new_dealer:${account.id}`);
        }
      } catch (indexingErr) {
        console.error('Auto Google indexing failed:', indexingErr);
      }
    }

    const { passwordSalt: _salt, passwordHash: _hash, ...safeAccount } = account;
    return NextResponse.json({
      account: { ...safeAccount, ...(accountType === 'vendor' ? { profileUrl: `/dealers/${account.slug}` } : {}), createdAt: new Date().toISOString() },
      initialPassword: password
    }, { status: 201 });
  } catch (reason) {
    if (reason && typeof reason === 'object' && 'code' in reason && reason.code === 11000) return NextResponse.json({ error: 'An account already uses that email.' }, { status: 409 });
    return NextResponse.json({ error: 'Account could not be created.' }, { status: 503 });
  }
}
