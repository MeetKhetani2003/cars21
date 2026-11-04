import { NextRequest, NextResponse } from 'next/server';
import { getDb, getPhotoBucket } from '@/server/mongodb';
import { getSession } from '@/server/auth';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per photo/document

async function uploadFileToBucket(file: File, category: string): Promise<string> {
  const bucket = await getPhotoBucket();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const filename = `sell_${category}_${Date.now()}_${safeName}`;
  const upload = bucket.openUploadStream(filename, {
    metadata: {
      contentType: file.type || 'application/octet-stream',
      originalName: file.name,
      category,
      uploadedAt: new Date(),
    },
  });

  const bytes = Buffer.from(await file.arrayBuffer());
  await new Promise<void>((resolve, reject) => {
    upload.once('error', reject);
    upload.once('finish', resolve);
    upload.end(bytes);
  });

  return upload.id.toString();
}

// Demo seed inquiries for initial display
function getDemoSellInquiries() {
  const now = Date.now();
  return [
    {
      id: 'sell_demo_01',
      inquiryNumber: 'SEL-2026-8801',
      seller: {
        name: 'Rajesh Solanki',
        phone: '9825123456',
        email: 'rajesh.solanki@example.com',
        city: 'Junagadh',
        state: 'Gujarat',
        pincode: '362001',
        address: 'Moti Baug Road, Near Agricultural University',
      },
      vehicle: {
        make: 'Hyundai',
        model: 'Creta',
        variant: 'SX (O) 1.5 Diesel AT',
        registration: 'GJ 11 AB 4589',
        purchaseYear: 2023,
        mfgYear: 2023,
        owners: 1,
        km: 26500,
        fuel: 'Diesel',
        transmission: 'Automatic',
        condition: 'Excellent',
        color: 'Polar White',
        bodyType: 'SUV',
        insuranceValidity: 'Comprehensive valid till Oct 2026',
        accidentalHistory: 'Zero accidental claims, showroom maintained',
        serviceHistory: 'Full service history available at authorized Hyundai dealership',
      },
      pricing: {
        expectedPrice: 1580000,
        estimatedMarketValue: 1540000,
        counterOffer: 1520000,
        sellingTimeline: 'within_week',
      },
      media: {
        photoFrontId: '',
        photoBackId: '',
        photoLeftSideId: '',
        photoRightSideId: '',
        photoInteriorId: '',
        additionalPhotoIds: [],
      },
      documents: {
        rcBookPhotoId: '',
        insurancePhotoId: '',
        verificationStatus: 'verified',
        verificationNotes: 'Original RC Smart Card verified. Junagadh RTO clear.',
      },
      status: 'inspection_scheduled',
      adminNotes: 'Seller wants payment within 3 days. Vehicle is single owner in pristine condition. Doorstep inspection scheduled for tomorrow.',
      createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'sell_demo_02',
      inquiryNumber: 'SEL-2026-8802',
      seller: {
        name: 'Amitabh Trivedi',
        phone: '9898234567',
        email: 'amitabh.trivedi@example.com',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
        address: 'Bopal, Near Iscon Platinum',
      },
      vehicle: {
        make: 'Maruti Suzuki',
        model: 'Brezza',
        variant: 'ZXi Plus AT',
        registration: 'GJ 01 DF 8721',
        purchaseYear: 2022,
        mfgYear: 2022,
        owners: 1,
        km: 34000,
        fuel: 'Petrol',
        transmission: 'Automatic',
        condition: 'Good',
        color: 'Magma Grey',
        bodyType: 'SUV',
        insuranceValidity: 'Zero Dep till Dec 2026',
        accidentalHistory: 'Minor bumper scratch on rear bumper',
        serviceHistory: 'All scheduled services done at Nexa Workshop',
      },
      pricing: {
        expectedPrice: 1050000,
        estimatedMarketValue: 1020000,
        counterOffer: 990000,
        sellingTimeline: 'immediate',
      },
      media: {
        photoFrontId: '',
        photoBackId: '',
        photoLeftSideId: '',
        photoRightSideId: '',
        photoInteriorId: '',
        additionalPhotoIds: [],
      },
      documents: {
        rcBookPhotoId: '',
        insurancePhotoId: '',
        verificationStatus: 'under_verification',
        verificationNotes: 'RC document uploaded. RTO tax verification in progress.',
      },
      status: 'new',
      adminNotes: 'Fresh inquiry received. Client is ready to sell immediately if price is around 10 Lakhs.',
      createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 120).toISOString(),
    },
    {
      id: 'sell_demo_03',
      inquiryNumber: 'SEL-2026-8803',
      seller: {
        name: 'Pradeep Patel',
        phone: '9426891234',
        email: 'pradeep.patel@example.com',
        city: 'Rajkot',
        state: 'Gujarat',
        pincode: '360005',
        address: 'Kalawad Road',
      },
      vehicle: {
        make: 'Tata',
        model: 'Nexon EV',
        variant: 'Empowered Plus 40.5 kWh',
        registration: 'GJ 03 EK 3344',
        purchaseYear: 2023,
        mfgYear: 2023,
        owners: 1,
        km: 19800,
        fuel: 'Electric',
        transmission: 'Automatic',
        condition: 'Excellent',
        color: 'Daytona Grey',
        bodyType: 'SUV',
        insuranceValidity: 'Comprehensive till Nov 2026',
        accidentalHistory: 'No accidental history',
        serviceHistory: 'Full EV battery health check: 98.4%',
      },
      pricing: {
        expectedPrice: 1420000,
        estimatedMarketValue: 1390000,
        counterOffer: 1375000,
        sellingTimeline: 'within_month',
      },
      media: {
        photoFrontId: '',
        photoBackId: '',
        photoLeftSideId: '',
        photoRightSideId: '',
        photoInteriorId: '',
        additionalPhotoIds: [],
      },
      documents: {
        rcBookPhotoId: '',
        insurancePhotoId: '',
        verificationStatus: 'verified',
        verificationNotes: 'EV subsidy & registration documents all verified.',
      },
      status: 'contacted',
      adminNotes: 'Spoke with seller on WhatsApp. Agreed for physical battery and paint scan on Friday.',
      createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
    }
  ];
}

// GET: Retrieve all sell inquiries
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    // Allow admin, superadmin, or vendor
    const isPrivileged = session?.role === 'superadmin' || session?.role === 'admin' || session?.role === 'vendor';
    if (!isPrivileged) {
      return NextResponse.json({ error: 'Unauthorized workspace access.' }, { status: 401 });
    }

    const db = await getDb();
    const collection = db.collection('sellInquiries');

    let items = await collection.find({}).sort({ createdAt: -1 }).toArray();

    // If database has 0 inquiries, seed demo inquiries so admin can test the workflow
    if (items.length === 0) {
      const demo = getDemoSellInquiries();
      await collection.insertMany(demo.map(item => ({ ...item, _id: new ObjectId() })));
      items = await collection.find({}).sort({ createdAt: -1 }).toArray();
    }

    const inquiries = items.map((doc: any) => {
      const { _id, ...rest } = doc;
      return {
        ...rest,
        id: rest.id || _id.toString(),
      };
    });

    const metrics = {
      total: inquiries.length,
      new: inquiries.filter((i: any) => i.status === 'new').length,
      contacted: inquiries.filter((i: any) => i.status === 'contacted').length,
      inspectionScheduled: inquiries.filter((i: any) => i.status === 'inspection_scheduled').length,
      priceNegotiated: inquiries.filter((i: any) => i.status === 'price_negotiated').length,
      purchased: inquiries.filter((i: any) => i.status === 'purchased').length,
      rejected: inquiries.filter((i: any) => i.status === 'rejected').length,
      verifiedRc: inquiries.filter((i: any) => i.documents?.verificationStatus === 'verified').length,
      totalExpectedVolume: inquiries.reduce((sum: number, i: any) => sum + (Number(i.pricing?.expectedPrice) || 0), 0),
    };

    return NextResponse.json({ inquiries, metrics });
  } catch (err) {
    console.error('Failed to get sell inquiries:', err);
    return NextResponse.json({ error: 'Failed to retrieve sell inquiries.' }, { status: 500 });
  }
}

// POST: Public submission of a Sell Car inquiry with 5 photos, RC book, expected price, etc.
export async function POST(request: NextRequest) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Multipart form data is required.' }, { status: 400 });
    }

    // Seller contact details
    const name = String(form.get('name') || '').trim();
    const phone = String(form.get('phone') || '').replace(/[^0-9]/g, '');
    const email = String(form.get('email') || '').trim().toLowerCase();
    const city = String(form.get('city') || '').trim();
    const state = String(form.get('state') || '').trim();
    const pincode = String(form.get('pincode') || '').replace(/[^0-9]/g, '');
    const address = String(form.get('address') || '').trim();

    // Basic validation
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }
    if (!city) {
      return NextResponse.json({ error: 'Please specify your city.' }, { status: 400 });
    }

    // Vehicle details
    const make = String(form.get('make') || '').trim();
    const model = String(form.get('model') || '').trim();
    const variant = String(form.get('variant') || '').trim();
    const registration = String(form.get('registration') || '').trim().toUpperCase();
    const purchaseYear = Number(form.get('purchaseYear') || form.get('year') || new Date().getFullYear());
    const mfgYear = Number(form.get('mfgYear') || form.get('year') || purchaseYear);
    const owners = Number(form.get('owners') || 1);
    const km = Number(form.get('km') || 0);
    const fuel = String(form.get('fuel') || 'Petrol').trim();
    const transmission = String(form.get('transmission') || 'Manual').trim();
    const condition = String(form.get('condition') || 'Good').trim();
    const color = String(form.get('color') || '').trim();
    const bodyType = String(form.get('bodyType') || '').trim();

    if (!make || !model) {
      return NextResponse.json({ error: 'Please specify the vehicle company (make) and model.' }, { status: 400 });
    }
    if (!registration) {
      return NextResponse.json({ error: 'Vehicle registration number is required.' }, { status: 400 });
    }

    // Expected pricing & timeline
    const expectedPrice = Number(form.get('expectedPrice') || 0);
    const estimatedMarketValue = Number(form.get('estimatedMarketValue') || 0);
    const sellingTimeline = String(form.get('timeline') || form.get('sellingTimeline') || 'immediate').trim();
    const additionalNotes = String(form.get('notes') || form.get('additionalNotes') || '').trim();
    const insuranceValidity = String(form.get('insuranceValidity') || '').trim();
    const accidentalHistory = String(form.get('accidentalHistory') || '').trim();

    if (expectedPrice <= 0) {
      return NextResponse.json({ error: 'Please specify what price you are expecting for your car.' }, { status: 400 });
    }

    // Process photo and document uploads
    const photoFrontFile = form.get('photoFront');
    const photoBackFile = form.get('photoBack');
    const photoLeftSideFile = form.get('photoLeftSide') || form.get('photoLeft');
    const photoRightSideFile = form.get('photoRightSide') || form.get('photoRight');
    const photoInteriorFile = form.get('photoInterior');
    const rcBookFile = form.get('rcBook') || form.get('rcBookPhoto') || form.get('rcDocument');
    const insuranceFile = form.get('insuranceDoc') || form.get('insurancePhoto');

    let photoFrontId = '';
    let photoBackId = '';
    let photoLeftSideId = '';
    let photoRightSideId = '';
    let photoInteriorId = '';
    let rcBookPhotoId = '';
    let insurancePhotoId = '';

    if (photoFrontFile instanceof File && photoFrontFile.size > 0) {
      if (photoFrontFile.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Front photo must be under 10MB.' }, { status: 400 });
      photoFrontId = await uploadFileToBucket(photoFrontFile, 'car_front');
    }
    if (photoBackFile instanceof File && photoBackFile.size > 0) {
      if (photoBackFile.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Rear photo must be under 10MB.' }, { status: 400 });
      photoBackId = await uploadFileToBucket(photoBackFile, 'car_back');
    }
    if (photoLeftSideFile instanceof File && photoLeftSideFile.size > 0) {
      if (photoLeftSideFile.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Left side photo must be under 10MB.' }, { status: 400 });
      photoLeftSideId = await uploadFileToBucket(photoLeftSideFile, 'car_left');
    }
    if (photoRightSideFile instanceof File && photoRightSideFile.size > 0) {
      if (photoRightSideFile.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Right side photo must be under 10MB.' }, { status: 400 });
      photoRightSideId = await uploadFileToBucket(photoRightSideFile, 'car_right');
    }
    if (photoInteriorFile instanceof File && photoInteriorFile.size > 0) {
      if (photoInteriorFile.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Interior photo must be under 10MB.' }, { status: 400 });
      photoInteriorId = await uploadFileToBucket(photoInteriorFile, 'car_interior');
    }
    if (rcBookFile instanceof File && rcBookFile.size > 0) {
      if (rcBookFile.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'RC book document must be under 10MB.' }, { status: 400 });
      rcBookPhotoId = await uploadFileToBucket(rcBookFile, 'rc_book');
    }
    if (insuranceFile instanceof File && insuranceFile.size > 0) {
      if (insuranceFile.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Insurance copy must be under 10MB.' }, { status: 400 });
      insurancePhotoId = await uploadFileToBucket(insuranceFile, 'insurance');
    }

    // Generate readable inquiry number
    const inquiryCount = Math.floor(1000 + Math.random() * 9000);
    const inquiryNumber = `SEL-${new Date().getFullYear()}-${inquiryCount}`;
    const id = `sell_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const session = getSession(request);
    const newInquiry = {
      id,
      inquiryNumber,
      userId: session?.sub || null,
      seller: {
        name,
        phone,
        email: email || undefined,
        city,
        state: state || 'Gujarat',
        pincode: pincode || undefined,
        address: address || undefined,
      },
      vehicle: {
        make,
        model,
        variant: variant || 'Standard',
        registration,
        purchaseYear,
        mfgYear,
        owners,
        km,
        fuel,
        transmission,
        condition,
        color: color || undefined,
        bodyType: bodyType || undefined,
        insuranceValidity: insuranceValidity || undefined,
        accidentalHistory: accidentalHistory || undefined,
        serviceHistory: undefined,
      },
      pricing: {
        expectedPrice,
        estimatedMarketValue: estimatedMarketValue || undefined,
        sellingTimeline,
      },
      media: {
        photoFrontId,
        photoBackId,
        photoLeftSideId,
        photoRightSideId,
        photoInteriorId,
        additionalPhotoIds: [],
      },
      documents: {
        rcBookPhotoId,
        insurancePhotoId: insurancePhotoId || undefined,
        verificationStatus: rcBookPhotoId ? 'under_verification' : 'unverified',
        verificationNotes: rcBookPhotoId ? 'RC Document uploaded by seller. Verification pending.' : 'RC Document not yet uploaded.',
      },
      status: 'new',
      adminNotes: additionalNotes ? `Seller note: ${additionalNotes}` : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    await db.collection('sellInquiries').insertOne({ ...newInquiry, _id: new ObjectId() });

    return NextResponse.json({
      success: true,
      id,
      inquiryNumber,
      message: 'Your sell inquiry has been received. Our automotive inspection team will contact you shortly.',
    }, { status: 201 });
  } catch (err) {
    console.error('Failed to submit sell inquiry:', err);
    return NextResponse.json({ error: 'Failed to submit sell inquiry. Please try again.' }, { status: 500 });
  }
}
