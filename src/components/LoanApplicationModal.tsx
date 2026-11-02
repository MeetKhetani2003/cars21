'use client';

import { useState, useId, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { 
  X, Landmark, ShieldCheck, CheckCircle2, Upload, FileText, 
  User, Phone, Mail, MapPin, Sparkles, CreditCard, ArrowRight,
  AlertCircle, Check, Image as ImageIcon
} from 'lucide-react';
import { calcEmi, formatINR } from '../data';

export type LoanCarProps = {
  id: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  price: number;
  city?: string;
  image?: string;
  vendorId?: string;
  vendorName?: string;
};

export function LoanApplicationModal({
  car,
  onClose,
  initialBuyer,
}: {
  car: LoanCarProps;
  onClose: () => void;
  initialBuyer?: { name?: string; email?: string; phone?: string; mobile?: string } | null;
}) {
  const formId = useId();

  // Loan calculation state
  const defaultLoan = Math.round(car.price * 0.8);
  const [loanAmount, setLoanAmount] = useState<number>(defaultLoan > 50000 ? defaultLoan : car.price);
  const [tenureMonths, setTenureMonths] = useState<number>(60);
  const interestRate = 10.5; // Competitive benchmark used across Cars21
  const monthlyEmi = Math.round(calcEmi(loanAmount, interestRate, tenureMonths));

  // Form input states
  const [name, setName] = useState(initialBuyer?.name || '');
  const [mobile, setMobile] = useState(initialBuyer?.mobile || initialBuyer?.phone || '');
  const [email, setEmail] = useState(initialBuyer?.email || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(car.city || 'Ahmedabad');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // File states & previews
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [aadhaarFrontPreview, setAadhaarFrontPreview] = useState<string>('');
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState<string>('');
  const [panPreview, setPanPreview] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<{
    applicationNumber: string;
    id: string;
  } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Handle Aadhaar formatting (XXXX XXXX XXXX)
  function handleAadhaarChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
    setAadhaarNumber(raw);
  }

  // Handle PAN formatting (uppercase, 10 chars)
  function handlePanChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPanNumber(val);
  }

  // Handle file selections with previews
  function handleFileChange(type: 'aadhaarFront' | 'aadhaarBack' | 'pan' | 'photo', e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(`File ${file.name} is larger than 5 MB. Please upload a smaller file.`);
      return;
    }
    setError('');

    const url = URL.createObjectURL(file);
    if (type === 'aadhaarFront') {
      setAadhaarFrontFile(file);
      setAadhaarFrontPreview(url);
    } else if (type === 'aadhaarBack') {
      setAadhaarBackFile(file);
      setAadhaarBackPreview(url);
    } else if (type === 'pan') {
      setPanFile(file);
      setPanPreview(url);
    } else if (type === 'photo') {
      setPhotoFile(file);
      setPhotoPreview(url);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    // Validations
    if (!name.trim()) {
      setError('Please provide your full legal name as per official documents.');
      return;
    }
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) {
      setError('Please provide a valid 10-digit Indian mobile number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!address.trim()) {
      setError('Please enter your full residential address.');
      return;
    }
    if (aadhaarNumber && aadhaarNumber.length !== 12) {
      setError('Aadhaar number must be exactly 12 digits.');
      return;
    }
    if (panNumber && panNumber.length !== 10) {
      setError('PAN card number must be exactly 10 alphanumeric characters (e.g. ABCDE1234F).');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('mobile', cleanMobile);
      formData.append('email', email.trim().toLowerCase());
      formData.append('address', address.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('pincode', pincode.trim());
      formData.append('aadhaarNumber', aadhaarNumber);
      formData.append('panNumber', panNumber);

      // Car details
      formData.append('carId', car.id);
      formData.append('carMake', car.make);
      formData.append('carModel', car.model);
      formData.append('carVariant', car.variant || '');
      formData.append('carYear', String(car.year));
      formData.append('carPrice', String(car.price));
      formData.append('carCity', car.city || '');
      formData.append('carImage', car.image || '');

      // Loan details
      formData.append('loanAmount', String(loanAmount));
      formData.append('tenureMonths', String(tenureMonths));
      formData.append('monthlyEmi', String(monthlyEmi));

      // Document files
      if (aadhaarFrontFile) formData.append('aadhaarFrontFile', aadhaarFrontFile);
      if (aadhaarBackFile) formData.append('aadhaarBackFile', aadhaarBackFile);
      if (panFile) formData.append('panFile', panFile);
      if (photoFile) formData.append('applicantPhoto', photoFile);

      const res = await fetch('/api/loans/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit loan application.');
      }

      setSuccessResult({
        applicationNumber: data.applicationNumber,
        id: data.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div 
      className="loan-modal-backdrop" 
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <section 
        className="loan-modal-shell" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="loan-modal-title"
      >
        {/* Header */}
        <header className="loan-modal-header">
          <div className="loan-modal-title-group">
            <span className="loan-badge-top">
              <Landmark size={14} /> LOANS24 AUTO FINANCING
            </span>
            <h2 id="loan-modal-title">
              Instant Car Loan Application
            </h2>
            <p>
              Pre-approved financing for <b>{car.year} {car.make} {car.model}</b> with partner banks at 10.5% p.a.
            </p>
          </div>
          <button 
            type="button" 
            className="loan-modal-close" 
            onClick={onClose} 
            aria-label="Close loan application dialog"
          >
            <X size={20} />
          </button>
        </header>

        {successResult ? (
          /* SUCCESS CONFIRMATION STATE */
          <div className="loan-modal-success-screen">
            <div className="loan-success-icon-wrap">
              <CheckCircle2 size={48} className="text-emerald" />
            </div>
            <h3>Car Loan Application Submitted!</h3>
            <p className="loan-success-lead">
              Your application has been received by the Cars21 Loans24 Banking Desk.
            </p>

            <div className="loan-success-card">
              <div className="success-row">
                <span>Application Reference ID</span>
                <b className="ref-code">{successResult.applicationNumber}</b>
              </div>
              <div className="success-row">
                <span>Selected Vehicle</span>
                <b>{car.year} {car.make} {car.model} {car.variant}</b>
              </div>
              <div className="success-row">
                <span>Requested Loan Amount</span>
                <b className="loan-figure">{formatINR(loanAmount)}</b>
              </div>
              <div className="success-row">
                <span>Estimated Monthly EMI</span>
                <b>{formatINR(monthlyEmi)} / month ({tenureMonths} mos)</b>
              </div>
              <div className="success-row">
                <span>Applicant Contact</span>
                <span>{name} · +91 {mobile}</span>
              </div>
            </div>

            <div className="loan-next-steps-box">
              <Sparkles size={18} className="text-orange" />
              <div>
                <b>What happens next?</b>
                <p>
                  Our verified banking advisor will verify your Aadhaar &amp; PAN records and call you on <b>+91 {mobile}</b> within 2 business hours for digital loan agreement sanctioning.
                </p>
              </div>
            </div>

            <button 
              type="button" 
              className="button button-orange button-full" 
              onClick={onClose}
            >
              Done &amp; Return to Marketplace <Check size={16} />
            </button>
          </div>
        ) : (
          /* APPLICATION FORM */
          <form className="loan-modal-form" onSubmit={handleSubmit}>
            {error && (
              <div className="loan-form-error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Car & Loan Financing Customizer Bento */}
            <div className="loan-customizer-card">
              <div className="loan-car-summary">
                {car.image ? (
                  <img src={car.image} alt={`${car.year} ${car.make} ${car.model}`} className="loan-car-thumb" />
                ) : (
                  <div className="loan-car-thumb fallback"><Landmark size={20}/></div>
                )}
                <div>
                  <small className="loan-kicker">VEHICLE TO FINANCE</small>
                  <h4>{car.year} {car.make} {car.model}</h4>
                  <span className="loan-car-price">Price: <b>{formatINR(car.price)}</b></span>
                </div>
              </div>

              {/* Slider for Loan Amount */}
              <div className="loan-slider-box">
                <div className="loan-slider-top">
                  <label htmlFor={`${formId}-amount`}>Desired Loan Amount</label>
                  <strong className="loan-slider-val">{formatINR(loanAmount)}</strong>
                </div>
                <input
                  id={`${formId}-amount`}
                  type="range"
                  min={50000}
                  max={car.price}
                  step={10000}
                  value={loanAmount}
                  onChange={e => setLoanAmount(Number(e.target.value))}
                  className="loan-range-slider"
                />
                <div className="loan-slider-limits">
                  <small>Min: {formatINR(50000)}</small>
                  <small>Max: {formatINR(car.price)} (100% On-Road)</small>
                </div>
              </div>

              {/* Tenure Selection & Live EMI */}
              <div className="loan-tenure-emi-grid">
                <div>
                  <label className="loan-field-label">Loan Duration / Tenure</label>
                  <div className="loan-tenure-chips">
                    {[12, 24, 36, 48, 60, 72, 84].map(months => (
                      <button
                        key={months}
                        type="button"
                        className={`tenure-chip ${tenureMonths === months ? 'active' : ''}`}
                        onClick={() => setTenureMonths(months)}
                      >
                        {months}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="loan-live-emi-badge">
                  <small>ESTIMATED MONTHLY PAYMENT</small>
                  <b>{formatINR(monthlyEmi)}<span>/mo</span></b>
                  <span className="tenure-note">@ {interestRate}% fixed APR</span>
                </div>
              </div>
            </div>

            {/* Section 1: Applicant Details */}
            <div className="loan-form-section">
              <h3 className="section-title">
                <User size={16} /> 1. Personal &amp; Contact Details
              </h3>
              <div className="form-grid-2">
                <label className="loan-input-group">
                  <span>Full Legal Name (as on PAN/Aadhaar) *</span>
                  <div className="input-wrap">
                    <User size={15} />
                    <input
                      required
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </label>

                <label className="loan-input-group">
                  <span>Mobile Number (for SMS &amp; Approval) *</span>
                  <div className="input-wrap">
                    <span className="prefix">+91</span>
                    <input
                      required
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                </label>
              </div>

              <div className="form-grid-2">
                <label className="loan-input-group">
                  <span>Email Address *</span>
                  <div className="input-wrap">
                    <Mail size={15} />
                    <input
                      required
                      type="email"
                      placeholder="ramesh@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </label>

                <label className="loan-input-group">
                  <span>Current City *</span>
                  <div className="input-wrap">
                    <MapPin size={15} />
                    <input
                      required
                      type="text"
                      placeholder="e.g. Junagadh, Rajkot, Ahmedabad"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    />
                  </div>
                </label>
              </div>

              <label className="loan-input-group">
                <span>Complete Residential Address *</span>
                <textarea
                  required
                  rows={2}
                  placeholder="Flat / House No, Society / Building Name, Area or Street"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </label>

              <div className="form-grid-2">
                <label className="loan-input-group">
                  <span>State *</span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Gujarat"
                    value={state}
                    onChange={e => setState(e.target.value)}
                  />
                </label>

                <label className="loan-input-group">
                  <span>Pincode *</span>
                  <input
                    required
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="e.g. 362001"
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  />
                </label>
              </div>
            </div>

            {/* Section 2: KYC & Document Uploads (Aadhaar, PAN, Photo) */}
            <div className="loan-form-section">
              <h3 className="section-title">
                <ShieldCheck size={16} /> 2. KYC Identity &amp; Documents (Aadhaar, PAN &amp; Photo)
              </h3>
              <p className="section-desc">
                Upload clear photos or scans of your KYC documents for instant pre-approval and credit check.
              </p>

              <div className="form-grid-2">
                {/* Aadhaar Card Box with Front & Back Uploads */}
                <div className="kyc-doc-card">
                  <div className="kyc-doc-header">
                    <CreditCard size={18} />
                    <div>
                      <b>Aadhaar Card (Front &amp; Back)</b>
                      <small>12-digit UIDAI Number, Front &amp; Back Photos</small>
                    </div>
                  </div>
                  <label className="loan-input-group" style={{ marginBottom: '8px' }}>
                    <span>Aadhaar Number (12 Digits)</span>
                    <input
                      type="text"
                      maxLength={12}
                      inputMode="numeric"
                      placeholder="e.g. 123456789012"
                      value={aadhaarNumber}
                      onChange={handleAadhaarChange}
                    />
                  </label>

                  <div className="aadhaar-dual-upload-stack">
                    {/* Front Photo */}
                    <div className="aadhaar-side-box">
                      <span className="upload-side-sub">Front Side (Photo &amp; Details)</span>
                      <label className="doc-upload-btn">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={e => handleFileChange('aadhaarFront', e)}
                        />
                        <Upload size={14} />
                        <span>{aadhaarFrontFile ? aadhaarFrontFile.name : 'Upload Front Side (Photo)'}</span>
                      </label>
                      {aadhaarFrontPreview && (
                        <div className="doc-preview-pill">
                          <Check size={12} /> Front side attached ({Math.round((aadhaarFrontFile?.size || 0) / 1024)} KB)
                        </div>
                      )}
                    </div>

                    {/* Back Photo */}
                    <div className="aadhaar-side-box">
                      <span className="upload-side-sub">Back Side (Address &amp; QR)</span>
                      <label className="doc-upload-btn">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={e => handleFileChange('aadhaarBack', e)}
                        />
                        <Upload size={14} />
                        <span>{aadhaarBackFile ? aadhaarBackFile.name : 'Upload Back Side (Address)'}</span>
                      </label>
                      {aadhaarBackPreview && (
                        <div className="doc-preview-pill">
                          <Check size={12} /> Back side attached ({Math.round((aadhaarBackFile?.size || 0) / 1024)} KB)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PAN Card Box */}
                <div className="kyc-doc-card">
                  <div className="kyc-doc-header">
                    <CreditCard size={18} />
                    <div>
                      <b>PAN Card</b>
                      <small>10-character Permanent Account Number</small>
                    </div>
                  </div>
                  <label className="loan-input-group" style={{ marginBottom: '8px' }}>
                    <span>PAN Number (Optional / 10 Characters)</span>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={handlePanChange}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </label>
                  <label className="doc-upload-btn">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={e => handleFileChange('pan', e)}
                    />
                    <Upload size={14} />
                    <span>{panFile ? panFile.name : 'Upload PAN Card (Image/PDF)'}</span>
                  </label>
                  {panPreview && (
                    <div className="doc-preview-pill">
                      <FileText size={13} /> Document attached ({Math.round((panFile?.size || 0) / 1024)} KB)
                    </div>
                  )}
                </div>
              </div>

              {/* Applicant Photo Box */}
              <div className="kyc-photo-upload-row">
                <div className="applicant-photo-avatar">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Applicant Preview" />
                  ) : (
                    <User size={28} />
                  )}
                </div>
                <div className="applicant-photo-text">
                  <b>Applicant Passport Photo / Selfie</b>
                  <p>Upload a clear front-facing photograph or selfie for digital KYC verification.</p>
                  <label className="doc-upload-btn inline">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={e => handleFileChange('photo', e)}
                    />
                    <ImageIcon size={14} />
                    <span>{photoFile ? photoFile.name : 'Select Photo'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Consent & Security */}
            <div className="loan-consent-card">
              <label className="loan-checkbox-label">
                <input type="checkbox" required defaultChecked />
                <span>
                  I authorize Cars21 and our RBI-licensed partner banks to verify my Aadhaar, PAN and contact details for evaluating and processing this auto loan application.
                </span>
              </label>
              <div className="loan-security-foot">
                <ShieldCheck size={14} /> 256-Bit Bank Grade Encryption · Zero spam guarantee
              </div>
            </div>

            {/* Actions */}
            <div className="loan-modal-actions">
              <button 
                type="button" 
                className="button button-outline" 
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="button button-orange loan-submit-cta"
                disabled={submitting}
              >
                {submitting ? 'Submitting Application…' : `Submit Loan Application · ${formatINR(monthlyEmi)}/mo`} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

