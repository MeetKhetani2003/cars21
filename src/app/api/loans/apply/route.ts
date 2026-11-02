import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth';
import { getDb, getPhotoBucket } from '@/server/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

async function uploadFileToBucket(file: File, category: string): Promise<string> {
  const bucket = await getPhotoBucket();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const filename = `loan_${category}_${Date.now()}_${safeName}`;
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

export async function POST(request: NextRequest) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Multipart form data is required.' }, { status: 400 });
    }

    const name = String(form.get('name') || '').trim();
    const mobile = String(form.get('mobile') || '').replace(/[^0-9]/g, '');
    const email = String(form.get('email') || '').trim().toLowerCase();
    const address = String(form.get('address') || '').trim();
    const city = String(form.get('city') || '').trim();
    const state = String(form.get('state') || '').trim();
    const pincode = String(form.get('pincode') || '').replace(/[^0-9]/g, '');
    const aadhaarNumber = String(form.get('aadhaarNumber') || '').replace(/[^0-9]/g, '');
    const panNumber = String(form.get('panNumber') || '').trim().toUpperCase();

    // Car & Loan values
    const carId = String(form.get('carId') || '').trim();
    const carMake = String(form.get('carMake') || '').trim();
    const carModel = String(form.get('carModel') || '').trim();
    const carVariant = String(form.get('carVariant') || '').trim();
    const carYear = Number(form.get('carYear') || 0);
    const carPrice = Number(form.get('carPrice') || 0);
    const carCity = String(form.get('carCity') || '').trim();
    const carImage = String(form.get('carImage') || '').trim();
    const loanAmount = Number(form.get('loanAmount') || 0);
    const tenureMonths = Number(form.get('tenureMonths') || 60);
    const monthlyEmi = Number(form.get('monthlyEmi') || 0);

    // Basic Validations
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name as per official documents.' }, { status: 400 });
    }
    if (!mobile || mobile.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!address || address.length < 5) {
      return NextResponse.json({ error: 'Please enter your complete residential address.' }, { status: 400 });
    }

    // Process files if attached
    let aadhaarFrontPhotoId = '';
    let aadhaarBackPhotoId = '';
    let panPhotoId = '';
    let applicantPhotoId = '';

    const aadhaarFrontFile = form.get('aadhaarFrontFile') || form.get('aadhaarFile');
    if (aadhaarFrontFile instanceof File && aadhaarFrontFile.size > 0) {
      if (aadhaarFrontFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Aadhaar front document must be 5 MB or smaller.' }, { status: 413 });
      }
      aadhaarFrontPhotoId = await uploadFileToBucket(aadhaarFrontFile, 'aadhaar_front');
    }

    const aadhaarBackFile = form.get('aadhaarBackFile');
    if (aadhaarBackFile instanceof File && aadhaarBackFile.size > 0) {
      if (aadhaarBackFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Aadhaar back document must be 5 MB or smaller.' }, { status: 413 });
      }
      aadhaarBackPhotoId = await uploadFileToBucket(aadhaarBackFile, 'aadhaar_back');
    }

    const panFile = form.get('panFile');
    if (panFile instanceof File && panFile.size > 0) {
      if (panFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'PAN document must be 5 MB or smaller.' }, { status: 413 });
      }
      panPhotoId = await uploadFileToBucket(panFile, 'pan');
    }

    const applicantPhoto = form.get('applicantPhoto');
    if (applicantPhoto instanceof File && applicantPhoto.size > 0) {
      if (applicantPhoto.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Applicant photo must be 5 MB or smaller.' }, { status: 413 });
      }
      applicantPhotoId = await uploadFileToBucket(applicantPhoto, 'applicant');
    }

    const db = await getDb();
    const session = getSession(request);

    // Look up car details from database if carId provided
    let carDoc: any = null;
    if (carId) {
      carDoc = await db.collection('cars').findOne({
        $or: [
          { id: carId },
          ...(ObjectId.isValid(carId) ? [{ _id: new ObjectId(carId) }] : []),
        ],
      });
    }

    const appDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const applicationNumber = `C21-LN-${appDateStr}-${randomSuffix}`;
    const id = `loan-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const applicationRecord = {
      id,
      applicationNumber,
      userId: session?.sub || null,
      applicant: {
        name,
        mobile,
        email,
        address: {
          full: address,
          city: city || carCity || 'Gujarat',
          state: state || 'Gujarat',
          pincode: pincode || '',
        },
        aadhaarNumber: aadhaarNumber || '',
        aadhaarPhotoId: aadhaarFrontPhotoId || null,
        aadhaarFrontPhotoId: aadhaarFrontPhotoId || null,
        aadhaarBackPhotoId: aadhaarBackPhotoId || null,
        panNumber: panNumber || '',
        panPhotoId: panPhotoId || null,
        photoId: applicantPhotoId || null,
      },
      car: {
        id: carId || carDoc?.id || '',
        make: carDoc?.make || carMake || 'Car',
        model: carDoc?.model || carModel || 'Model',
        variant: carDoc?.variant || carVariant || '',
        year: Number(carDoc?.year || carYear || 2022),
        price: Number(carDoc?.price || carPrice || 0),
        city: carDoc?.city || carCity || '',
        image: carDoc?.image || carImage || '',
        vendorId: carDoc?.vendorId || null,
        vendorName: carDoc?.vendorName || null,
      },
      loanDetails: {
        carPrice: Number(carDoc?.price || carPrice || 0),
        loanAmount: Number(loanAmount || Math.round((carDoc?.price || carPrice || 500000) * 0.8)),
        tenureMonths: Number(tenureMonths || 60),
        interestRate: 10.5,
        monthlyEmi: Number(monthlyEmi || 0),
      },
      status: 'new', // 'new' | 'under_review' | 'documents_verified' | 'approved' | 'rejected' | 'disbursed'
      adminNotes: '',
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('loan_applications').insertOne(applicationRecord);

    // Record user activity for logged-in buyer
    if (session?.sub) {
      await db.collection('user_actions').insertOne({
        userId: session.sub,
        clientName: name,
        clientEmail: email,
        action: 'loan_application',
        targetType: 'car',
        targetLabel: `${applicationRecord.car.year} ${applicationRecord.car.make} ${applicationRecord.car.model}`.trim(),
        carId: applicationRecord.car.id,
        loanAmount: applicationRecord.loanDetails.loanAmount,
        tenureMonths: applicationRecord.loanDetails.tenureMonths,
        monthlyEmi: applicationRecord.loanDetails.monthlyEmi,
        applicationNumber,
        createdAt: new Date(),
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      id,
      applicationNumber,
      message: 'Loan application submitted successfully.',
      car: applicationRecord.car,
      loanDetails: applicationRecord.loanDetails,
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting loan application:', error);
    return NextResponse.json({ error: 'Could not process loan application. Please try again.' }, { status: 500 });
  }
}

