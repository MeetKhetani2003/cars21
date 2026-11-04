'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CarFront, Camera, FileText, CheckCircle2, AlertCircle,
  Upload, X, ArrowRight, ShieldCheck, DollarSign, Calendar,
  User, Phone, Mail, MapPin, Sparkles, HelpCircle, Check
} from 'lucide-react';
import { formatINR } from '../data';

type MakeItem = {
  id: string;
  name: string;
  models?: Array<{ id: string; name: string; body?: string; years?: number[] }>;
};

type CityItem = {
  id: string;
  name: string;
  state: string;
  pincode?: string;
  popular?: boolean;
};

export function SellCarInquiryForm({ onSuccess }: { onSuccess?: (inquiryNumber: string) => void }) {
  // Makes & Cities
  const [makes, setMakes] = useState<MakeItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [selectedMake, setSelectedMake] = useState('Hyundai');
  const [modelInput, setModelInput] = useState('Creta');

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Junagadh');
  const [pincode, setPincode] = useState('362001');
  const [address, setAddress] = useState('');
  const [registration, setRegistration] = useState('');
  const [variant, setVariant] = useState('');
  const [purchaseYear, setPurchaseYear] = useState<number>(2023);
  const [mfgYear, setMfgYear] = useState<number>(2023);
  const [owners, setOwners] = useState<number>(1);
  const [km, setKm] = useState<number>(32000);
  const [fuel, setFuel] = useState('Petrol');
  const [transmission, setTransmission] = useState('Manual');
  const [condition, setCondition] = useState('Good');
  const [color, setColor] = useState('White');
  const [expectedPrice, setExpectedPrice] = useState<string>('950000');
  const [timeline, setTimeline] = useState('within_week');
  const [notes, setNotes] = useState('');

  // File Upload States
  const [photoFront, setPhotoFront] = useState<File | null>(null);
  const [photoBack, setPhotoBack] = useState<File | null>(null);
  const [photoLeftSide, setPhotoLeftSide] = useState<File | null>(null);
  const [photoRightSide, setPhotoRightSide] = useState<File | null>(null);
  const [photoInterior, setPhotoInterior] = useState<File | null>(null);
  const [rcBook, setRcBook] = useState<File | null>(null);
  const [insuranceDoc, setInsuranceDoc] = useState<File | null>(null);

  // Previews
  const [previewFront, setPreviewFront] = useState<string>('');
  const [previewBack, setPreviewBack] = useState<string>('');
  const [previewLeft, setPreviewLeft] = useState<string>('');
  const [previewRight, setPreviewRight] = useState<string>('');
  const [previewInterior, setPreviewInterior] = useState<string>('');
  const [previewRc, setPreviewRc] = useState<string>('');

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load makes & cities
  useEffect(() => {
    fetch('/api/admin/makes')
      .then(res => res.json())
      .then(data => {
        if (data.makes && data.makes.length > 0) {
          setMakes(data.makes);
          if (!selectedMake) setSelectedMake(data.makes[0].name);
        }
      })
      .catch(() => {});

    fetch('/api/admin/cities')
      .then(res => res.json())
      .then(data => {
        if (data.cities && data.cities.length > 0) {
          setCities(data.cities);
        }
      })
      .catch(() => {});
  }, []);

  // Filter models
  const currentMakeObj = makes.find(m => m.name.toLowerCase() === selectedMake.toLowerCase());
  const availableModels = currentMakeObj?.models || [];

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    previewSetter?: (s: string) => void
  ) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Files must be 10MB or smaller.');
        return;
      }
      setter(file);
      if (previewSetter) {
        const url = URL.createObjectURL(file);
        previewSetter(url);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validations
    if (!name.trim()) return setError('Please enter your full name.');
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit mobile number.');
    if (!registration.trim()) return setError('Please enter the vehicle registration number.');
    if (!expectedPrice || Number(expectedPrice) <= 0) return setError('Please enter your expected selling price.');

    // Photos check - Front and RC Book strongly recommended
    if (!rcBook) {
      if (!window.confirm('You have not uploaded the RC Book document yet. Submitting with an RC document guarantees high priority inspection. Do you wish to continue?')) {
        return;
      }
    }

    setSubmitting(true);
    const formData = new FormData();

    formData.append('name', name.trim());
    formData.append('phone', phone.trim());
    formData.append('email', email.trim());
    formData.append('city', city.trim());
    formData.append('pincode', pincode.trim());
    formData.append('address', address.trim());

    formData.append('make', selectedMake);
    formData.append('model', modelInput);
    formData.append('variant', variant.trim());
    formData.append('registration', registration.trim().toUpperCase());
    formData.append('purchaseYear', String(purchaseYear));
    formData.append('mfgYear', String(mfgYear));
    formData.append('owners', String(owners));
    formData.append('km', String(km));
    formData.append('fuel', fuel);
    formData.append('transmission', transmission);
    formData.append('condition', condition);
    formData.append('color', color);

    formData.append('expectedPrice', String(expectedPrice));
    formData.append('timeline', timeline);
    formData.append('notes', notes.trim());

    // Files
    if (photoFront) formData.append('photoFront', photoFront);
    if (photoBack) formData.append('photoBack', photoBack);
    if (photoLeftSide) formData.append('photoLeftSide', photoLeftSide);
    if (photoRightSide) formData.append('photoRightSide', photoRightSide);
    if (photoInterior) formData.append('photoInterior', photoInterior);
    if (rcBook) formData.append('rcBook', rcBook);
    if (insuranceDoc) formData.append('insuranceDoc', insuranceDoc);

    try {
      const res = await fetch('/api/sell-inquiries', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit sell inquiry.');

      setSubmittedInquiry(data.inquiryNumber || 'Submitted');
      if (onSuccess) onSuccess(data.inquiryNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedInquiry) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px 30px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 20px 45px rgba(15,23,42,0.06)' }}>
        <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
          <CheckCircle2 size={36} />
        </div>
        <span className="eyebrow" style={{ color: '#16a34a', letterSpacing: '0.12em' }}>INQUIRY RECEIVED</span>
        <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 10px', color: '#0f172a' }}>
          Sell Inquiry Successfully Submitted!
        </h2>
        <p style={{ maxWidth: '520px', margin: '0 auto 20px', color: '#64748b', fontSize: '13.5px', lineHeight: 1.6 }}>
          Thank you, <strong>{name}</strong>! Your car details, 5-perspective photos, RC document, and expected price of <strong>{formatINR(Number(expectedPrice) || 0)}</strong> have been routed to our valuation desk.
        </p>

        <div style={{ display: 'inline-block', background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '12px 24px', borderRadius: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>YOUR INQUIRY TRACKING ID</span>
          <strong style={{ fontSize: '18px', color: '#2563eb', letterSpacing: '0.05em' }}>{submittedInquiry}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setSubmittedInquiry(null);
              setRegistration('');
              setExpectedPrice('950000');
              setPhotoFront(null);
              setPhotoBack(null);
              setPhotoLeftSide(null);
              setPhotoRightSide(null);
              setPhotoInterior(null);
              setRcBook(null);
            }}
          >
            Submit Another Vehicle
          </button>
          <a href="/buy-cars" className="button button-outline">
            Browse Marketplace Cars
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="sell-car-inquiry-form" onSubmit={handleSubmit} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '32px clamp(18px, 4vw, 36px)', boxShadow: '0 20px 45px rgba(15,23,42,0.06)' }}>
      {/* Form Header */}
      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff5c00', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
          <Sparkles size={15} /> Direct Sell Car Inquiry
        </div>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 8px', color: '#0f172a', letterSpacing: '-0.03em' }}>
          Sell Your Car directly on Cars21
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>
          Provide your vehicle details, expected selling price, 5-perspective photos, and RC book document. Our valuation experts will review your dossier and contact you with verified dealer offers.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '12px', fontSize: '12.5px', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* SECTION 1: VEHICLE SPECIFICATIONS */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '24px', height: '24px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', display: 'grid', placeItems: 'center', fontSize: '12px' }}>1</span>
          Vehicle Identification &amp; Technical Specs
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <label className="field-label">
            Company / Make *
            <select
              value={selectedMake}
              onChange={e => setSelectedMake(e.target.value)}
              required
            >
              {makes.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
              {!makes.some(m => m.name.toLowerCase() === selectedMake.toLowerCase()) && (
                <option value={selectedMake}>{selectedMake}</option>
              )}
            </select>
          </label>

          <label className="field-label">
            Model *
            <input
              list="form-models-list"
              value={modelInput}
              onChange={e => setModelInput(e.target.value)}
              placeholder="e.g. Creta, Swift, Nexon, Brezza"
              required
            />
            <datalist id="form-models-list">
              {availableModels.map(m => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </label>

          <label className="field-label">
            Variant
            <input
              value={variant}
              onChange={e => setVariant(e.target.value)}
              placeholder="e.g. SX (O), ZXi Plus, XZ+"
            />
          </label>

          <label className="field-label">
            Registration Plate *
            <input
              value={registration}
              onChange={e => setRegistration(e.target.value.toUpperCase())}
              placeholder="e.g. GJ 03 AB 1234 or KA 05 MN 2023"
              style={{ textTransform: 'uppercase', fontWeight: 700 }}
              required
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
          <label className="field-label">
            Year of Purchase *
            <select
              value={purchaseYear}
              onChange={e => setPurchaseYear(Number(e.target.value))}
              required
            >
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Number of Owners *
            <select
              value={owners}
              onChange={e => setOwners(Number(e.target.value))}
              required
            >
              <option value={1}>1st Owner (Single)</option>
              <option value={2}>2nd Owner</option>
              <option value={3}>3rd Owner</option>
              <option value={4}>4th+ Owner</option>
            </select>
          </label>

          <label className="field-label">
            Kilometers Driven (Km) *
            <input
              type="number"
              value={km}
              onChange={e => setKm(Number(e.target.value))}
              min={0}
              max={1000000}
              placeholder="e.g. 32000"
              required
            />
          </label>

          <label className="field-label">
            Fuel Type *
            <select value={fuel} onChange={e => setFuel(e.target.value)}>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric (EV)</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </label>

          <label className="field-label">
            Transmission *
            <select value={transmission} onChange={e => setTransmission(e.target.value)}>
              <option value="Manual">Manual</option>
              <option value="Automatic">Automatic (AT / DCT / CVT / AMT)</option>
            </select>
          </label>

          <label className="field-label">
            Vehicle Condition *
            <select value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="Excellent">Excellent (Like New)</option>
              <option value="Good">Good (Minor normal wear)</option>
              <option value="Fair">Fair (Needs small touchup)</option>
              <option value="Needs Work">Needs Mechanical / Body Work</option>
            </select>
          </label>
        </div>
      </div>

      {/* SECTION 2: EXPECTED PRICING & SELLING TIMELINE */}
      <div style={{ marginBottom: '28px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '24px', height: '24px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', display: 'grid', placeItems: 'center', fontSize: '12px' }}>2</span>
          What Price Are You Expecting? (₹)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '16px' }}>
          <label className="field-label">
            Expected Selling Price (in INR ₹) *
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>₹</span>
              <input
                type="number"
                value={expectedPrice}
                onChange={e => setExpectedPrice(e.target.value)}
                placeholder="e.g. 950000"
                style={{ paddingLeft: '28px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}
                required
              />
            </div>
            {Number(expectedPrice) > 0 && (
              <small style={{ color: '#2563eb', fontWeight: 700, marginTop: '4px' }}>
                Formatted: {formatINR(Number(expectedPrice))}
              </small>
            )}
          </label>

          <label className="field-label">
            Selling Urgency / Timeline
            <select value={timeline} onChange={e => setTimeline(e.target.value)}>
              <option value="immediate">Immediate (Ready to sell within 3 days)</option>
              <option value="within_week">Within a week</option>
              <option value="within_month">Within this month</option>
              <option value="exploring">Just exploring offers</option>
            </select>
          </label>
        </div>
      </div>

      {/* SECTION 3: 5-ANGLE CAR PHOTOS (FRONT, BACK, SIDES, INTERIOR) */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '24px', height: '24px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', display: 'grid', placeItems: 'center', fontSize: '12px' }}>3</span>
            Car Photos: Front, Back, Sides &amp; Interior (Required)
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            Upload clean photos from all 5 perspectives so dealers and buyers can evaluate your car accurately.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
          {/* Front Photo */}
          <div style={{ background: '#f8fafc', border: previewFront ? '1.5px solid #2563eb' : '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '12px', textAlign: 'center', position: 'relative' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
              1. Front Angle
            </span>
            {previewFront ? (
              <div style={{ height: '90px', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                <img src={previewFront} alt="Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setPhotoFront(null); setPreviewFront(''); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: '50%', width: '22px', height: '22px', display: 'grid', placeItems: 'center' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '16px 8px' }}>
                <Camera size={24} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>Upload Front</span>
                <input type="file" accept="image/*" onChange={e => handleFileChange(e, setPhotoFront, setPreviewFront)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Back Photo */}
          <div style={{ background: '#f8fafc', border: previewBack ? '1.5px solid #2563eb' : '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '12px', textAlign: 'center', position: 'relative' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
              2. Back / Rear
            </span>
            {previewBack ? (
              <div style={{ height: '90px', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                <img src={previewBack} alt="Back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setPhotoBack(null); setPreviewBack(''); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: '50%', width: '22px', height: '22px', display: 'grid', placeItems: 'center' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '16px 8px' }}>
                <Camera size={24} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>Upload Back</span>
                <input type="file" accept="image/*" onChange={e => handleFileChange(e, setPhotoBack, setPreviewBack)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Left Side */}
          <div style={{ background: '#f8fafc', border: previewLeft ? '1.5px solid #2563eb' : '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '12px', textAlign: 'center', position: 'relative' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
              3. Left Side
            </span>
            {previewLeft ? (
              <div style={{ height: '90px', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                <img src={previewLeft} alt="Left Side" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setPhotoLeftSide(null); setPreviewLeft(''); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: '50%', width: '22px', height: '22px', display: 'grid', placeItems: 'center' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '16px 8px' }}>
                <Camera size={24} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>Upload Left Side</span>
                <input type="file" accept="image/*" onChange={e => handleFileChange(e, setPhotoLeftSide, setPreviewLeft)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Right Side */}
          <div style={{ background: '#f8fafc', border: previewRight ? '1.5px solid #2563eb' : '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '12px', textAlign: 'center', position: 'relative' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
              4. Right Side
            </span>
            {previewRight ? (
              <div style={{ height: '90px', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                <img src={previewRight} alt="Right Side" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setPhotoRightSide(null); setPreviewRight(''); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: '50%', width: '22px', height: '22px', display: 'grid', placeItems: 'center' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '16px 8px' }}>
                <Camera size={24} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>Upload Right Side</span>
                <input type="file" accept="image/*" onChange={e => handleFileChange(e, setPhotoRightSide, setPreviewRight)} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Cabin Interior */}
          <div style={{ background: '#f8fafc', border: previewInterior ? '1.5px solid #2563eb' : '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '12px', textAlign: 'center', position: 'relative' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
              5. Cabin Interior
            </span>
            {previewInterior ? (
              <div style={{ height: '90px', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                <img src={previewInterior} alt="Interior" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setPhotoInterior(null); setPreviewInterior(''); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: '50%', width: '22px', height: '22px', display: 'grid', placeItems: 'center' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '16px 8px' }}>
                <Camera size={24} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>Upload Interior</span>
                <input type="file" accept="image/*" onChange={e => handleFileChange(e, setPhotoInterior, setPreviewInterior)} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: REQUIRED RC BOOK DOCUMENT */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '24px', height: '24px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', display: 'grid', placeItems: 'center', fontSize: '12px' }}>4</span>
          Required Document: RC Book (Registration Certificate)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '16px' }}>
          {/* RC Document Upload */}
          <div style={{ background: '#f8fafc', border: previewRc ? '1.5px solid #16a34a' : '1.5px dashed #cbd5e1', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', background: previewRc ? '#dcfce7' : '#eff6ff', color: previewRc ? '#16a34a' : '#2563eb', borderRadius: '10px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <FileText size={26} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: '12.5px', color: '#0f172a', display: 'block' }}>
                {rcBook ? rcBook.name : 'Upload Vehicle RC Book Photo or PDF'}
              </b>
              <small style={{ color: '#64748b', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                Required document for ownership verification &amp; instant offer approval.
              </small>
            </div>
            <label className="button button-outline" style={{ minHeight: '38px', padding: '0 14px', fontSize: '11.5px', cursor: 'pointer', flexShrink: 0 }}>
              <Upload size={14} /> {rcBook ? 'Change RC' : 'Select RC File'}
              <input type="file" accept="image/*,application/pdf" onChange={e => handleFileChange(e, setRcBook, setPreviewRc)} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Optional Insurance */}
          <div style={{ background: '#f8fafc', border: insuranceDoc ? '1.5px solid #16a34a' : '1.5px dashed #cbd5e1', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', color: '#2563eb', borderRadius: '10px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <ShieldCheck size={26} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: '12.5px', color: '#0f172a', display: 'block' }}>
                {insuranceDoc ? insuranceDoc.name : 'Insurance Copy (Optional)'}
              </b>
              <small style={{ color: '#64748b', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                Boosts offer valuation by confirming active policy.
              </small>
            </div>
            <label className="button button-outline" style={{ minHeight: '38px', padding: '0 14px', fontSize: '11.5px', cursor: 'pointer', flexShrink: 0 }}>
              <Upload size={14} /> {insuranceDoc ? 'Change' : 'Upload'}
              <input type="file" accept="image/*,application/pdf" onChange={e => handleFileChange(e, setInsuranceDoc)} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 5: SELLER CONTACT DETAILS */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '24px', height: '24px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', display: 'grid', placeItems: 'center', fontSize: '12px' }}>5</span>
          Seller Contact &amp; Inspection Location
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <label className="field-label">
            Your Full Name *
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rajesh Solanki"
              required
            />
          </label>

          <label className="field-label">
            Mobile Number (WhatsApp) *
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              required
            />
          </label>

          <label className="field-label">
            Email Address
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="field-label">
            City *
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Junagadh, Ahmedabad, Rajkot"
              required
            />
          </label>

          <label className="field-label">
            PIN Code
            <input
              value={pincode}
              onChange={e => setPincode(e.target.value)}
              placeholder="e.g. 362001"
            />
          </label>

          <label className="field-label" style={{ gridColumn: 'span 2' }}>
            Full Pickup / Inspection Address
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="House/Flat number, Street name, Landmark"
            />
          </label>
        </div>

        <label className="field-label" style={{ marginTop: '14px' }}>
          Additional Notes / Remarks about your Car
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Mention any service records, battery warranty, recent tyre changes, or minor scratches..."
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px', fontSize: '12px', fontFamily: 'inherit' }}
          />
        </label>
      </div>

      {/* SUBMIT BUTTON */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
          <ShieldCheck size={16} style={{ color: '#16a34a' }} />
          <span>Your contact &amp; car documents are encrypted and shared only with certified Cars21 partners.</span>
        </div>

        <button
          type="submit"
          className="button button-primary"
          disabled={submitting}
          style={{ minHeight: '48px', padding: '0 28px', fontSize: '14px', fontWeight: 800 }}
        >
          {submitting ? 'Uploading Documents & Submitting…' : 'Submit Sell Inquiry'} <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

