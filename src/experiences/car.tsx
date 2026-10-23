'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from '../lib/navigation';
import { 
  ArrowRight, Check, ChevronRight, Fuel, Gauge, Heart, MapPin, 
  ShieldCheck, UserRound, Calendar, Award, Sparkles, Phone, 
  MessageSquare, FileText, CheckCircle2, RotateCcw, Wrench, 
  Clock, Shield, CarFront, Settings2, Download
} from 'lucide-react';
import { cars, calcEmi, formatINR, type Car } from '../data';
import { CarCard } from '../components/CarCard';
import { RevealPhoneButton } from '../components/RevealPhoneButton';
import { SectionTitle } from '../components/shared';
import { useBuyerExperience } from '../components/BuyerExperienceProvider';

type EnquiryState = 'idle' | 'saving' | 'saved' | 'error';

function InspectionScoreBar({ label, score, status = 'Passed' }: { label: string; score: number; status?: string }) {
  return (
    <div className="inspection-category-card">
      <div className="cat-top">
        <span className="cat-label">{label}</span>
        <span className="cat-badge-pass"><CheckCircle2 size={13} /> {status}</span>
      </div>
      <div className="cat-meter">
        <div className="cat-meter-fill" style={{ width: `${score}%` }} />
      </div>
      <div className="cat-bottom">
        <small>Diagnostic Health</small>
        <b>{score}%</b>
      </div>
    </div>
  );
}

function InspectionReport({ car }: { car: Car }) {
  if (car.inspectionReviewStatus && car.inspectionReviewStatus !== 'approved') {
    return (
      <div className="inspection-review-notice">
        <div className="notice-icon"><Clock size={24} /></div>
        <div>
          <h3>Digital Inspection Under Verification</h3>
          <p>The dealer has submitted the 140-point diagnostic checklist and high-res evidence to Cars21 engineers. You may enquire and schedule a physical inspection anytime.</p>
        </div>
      </div>
    );
  }

  const sections = [
    { label: 'Engine & Transmission', key: 'engine', score: 99, desc: 'Compression optimal, zero oil leaks, smooth shifting' },
    { label: 'Brakes & Suspension', key: 'tyres', score: 97, desc: '75%+ brake pad life, zero strut leakage, crisp steering' },
    { label: 'Electrical & Electronics', key: 'electronics', score: 100, desc: 'AC cooling certified, infotainment, battery health 100%' },
    { label: 'Exterior & Body Panels', key: 'exterior', score: 96, desc: 'Original factory paint, zero structural impact detected' },
    { label: 'Interior & Cabin', key: 'interior', score: 98, desc: 'Deep sanitized, pristine upholstery, functional controls' },
    { label: 'Road Test Diagnostics', key: 'roadTest', score: 100, desc: 'High-speed stability tested, zero abnormal cabin NVH' },
  ];

  const evidence = Array.isArray(car.inspection?.evidencePhotoIds) ? car.inspection?.evidencePhotoIds as string[] : [];

  return (
    <div className="luxury-inspection-wrap">
      {/* Top Banner */}
      <div className="inspection-certified-banner">
        <div className="cert-left">
          <div className="cert-seal">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3>Cars21 140-Point Certified Inspection</h3>
            <p>Inspected by certified automotive diagnostic engineers with OBD-II telematics diagnostics.</p>
          </div>
        </div>
        <div className="cert-overall-score">
          <b>{car.score || 98}<span>/100</span></b>
          <small>Overall Condition Score</small>
        </div>
      </div>

      {/* Grid of category meters */}
      <div className="inspection-categories-grid">
        {sections.map(sec => (
          <InspectionScoreBar key={sec.key} label={sec.label} score={sec.score} />
        ))}
      </div>

      {/* Detailed Checkpoint Breakdown */}
      <div className="inspection-checkpoints-list">
        <h4>Diagnostic Findings & Health Summary</h4>
        <div className="checkpoints-table">
          {sections.map(sec => (
            <div key={sec.key} className="checkpoint-row">
              <div className="cp-name">
                <CheckCircle2 size={16} className="text-emerald" />
                <b>{sec.label}</b>
              </div>
              <div className="cp-detail">{sec.desc}</div>
              <div className="cp-status">
                <span className="cp-tag-verified">Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {Boolean(car.inspection?.notes) && (
        <div className="inspector-notes-box">
          <b>Inspector Notes:</b>
          <p>{String(car.inspection?.notes)}</p>
        </div>
      )}

      {evidence.length > 0 && (
        <div className="inspection-evidence-gallery">
          <h4>Inspector Uploaded Diagnostic Proof ({evidence.length} photos)</h4>
          <div className="evidence-grid">
            {evidence.map((id, index) => (
              <a key={id} href={`/api/photos/${encodeURIComponent(id)}`} target="_blank" rel="noreferrer" className="evidence-thumb-link">
                <img src={`/api/photos/${encodeURIComponent(id)}`} alt={`Inspection checkpoint proof ${index + 1}`} loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CarPage() {
  const { carId } = useParams();
  const [car, setCar] = useState<Car>(() => cars.find(item => item.id === carId) || cars[0]);
  const [selectedImage, setSelectedImage] = useState(car.image);
  const [tab, setTab] = useState<'overview' | 'inspection' | 'assurance' | 'specs'>('overview');
  const { wishlistIds, toggleWishlist, loadingBuyer } = useBuyerExperience();
  const saved = wishlistIds.includes(car.id);
  const listingPhotos = [...new Set([car.image, ...(car.photos || [])].filter(Boolean))];
  const [enquiryState, setEnquiryState] = useState<EnquiryState>('idle');
  const [formMessage, setFormMessage] = useState('');
  const [buyer, setBuyer] = useState<{ name: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const lastTrackedCar = useRef('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' })
      .then(response => response.json())
      .then(payload => { if (!controller.signal.aborted) setBuyer(payload.user?.role === 'buyer' ? payload.user : null); })
      .catch(() => { if (!controller.signal.aborted) setBuyer(null); })
      .finally(() => { if (!controller.signal.aborted) setAuthLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!carId) return;
    const controller = new AbortController();
    fetch(`/api/cars/${encodeURIComponent(carId)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => { 
        if (payload?.car) { 
          setCar(payload.car as Car); 
          setSelectedImage((payload.car as Car).image); 
          if (lastTrackedCar.current !== carId) { 
            lastTrackedCar.current = carId; 
            void fetch('/api/user/actions', { 
              method: 'POST', 
              credentials: 'same-origin', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ action: 'car_view', carId }) 
            }).catch(() => null); 
          } 
        } 
      })
      .catch(() => {});
    return () => controller.abort();
  }, [carId]);

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnquiryState('saving');
    setFormMessage('');
    const form = new FormData(event.currentTarget);
    const details = Object.fromEntries(form.entries());
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, carId: car.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not save your request. Please try again.');
      setEnquiryState('saved');
      setFormMessage('Your request is confirmed! Redirecting to WhatsApp for instant seller connection...');
      if (result.whatsappUrl) {
        window.location.assign(result.whatsappUrl);
      } else {
        setFormMessage('Your request is confirmed! A Cars21 advisor will reach out shortly.');
      }
    } catch (error) {
      setEnquiryState('error');
      setFormMessage(error instanceof Error ? error.message : 'We could not submit your request. Please try again.');
    }
  }

  const emiVal = Math.round(calcEmi(car.price * 0.8, 10.5, 60));

  return (
    <div className="car-detail-page-wrapper">
      {/* Sleek Breadcrumb Bar */}
      <div className="container detail-top-breadcrumb">
        <div className="crumb-wrap">
          <Link to="/">Home</Link>
          <ChevronRight size={13} />
          <Link to="/buy-cars">Buy Cars</Link>
          <ChevronRight size={13} />
          <Link to={`/buy-cars?city=${encodeURIComponent(car.city)}`}>{car.city}</Link>
          <ChevronRight size={13} />
          <span className="crumb-active">{car.year} {car.make} {car.model}</span>
        </div>
      </div>

      {/* Main Showcase Hero (Gallery + Sticky Decision Hub) */}
      <section className="container car-detail-hero-section">
        {/* Left Column: Gallery, Specs Bento, & Assurances */}
        <div className="detail-hero-left">
          {/* Main Visual Stage */}
          <div className="luxury-gallery-stage">
            <div className={`gallery-photo-main ${car.accent || ''}`}>
              <img 
                src={selectedImage} 
                alt={`${car.color} ${car.year} ${car.make} ${car.model}`} 
                className="stage-main-img"
              />
              {/* Floating Quality Badges */}
              <div className="stage-floating-badges">
                <span className="stage-badge-assured">
                  <ShieldCheck size={14} /> Cars21 Assured
                </span>
                <span className="stage-badge-return">
                  <RotateCcw size={13} /> 7-Day Money Back
                </span>
                <span className="stage-badge-warranty">
                  <Wrench size={13} /> 1-Year Warranty
                </span>
              </div>
              {/* Photo Counter */}
              <div className="stage-photo-counter">
                <span>{String(Math.max(1, listingPhotos.indexOf(selectedImage) + 1)).padStart(2, '0')}</span>
                <span>/</span>
                <span>{String(Math.max(1, listingPhotos.length)).padStart(2, '0')} Photos</span>
              </div>
            </div>

            {/* Thumbnails Row */}
            {listingPhotos.length > 1 && (
              <div className="gallery-thumbnails-strip">
                {listingPhotos.slice(0, 10).map((photo, index) => (
                  <button
                    key={photo}
                    type="button"
                    className={`gallery-thumb-item ${photo === selectedImage ? 'is-selected' : ''}`}
                    onClick={() => setSelectedImage(photo)}
                    aria-label={`View photo ${index + 1}`}
                  >
                    <img src={photo} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verified Seller / Showroom Bar */}
          <div className="verified-seller-strip-card">
            <div className="seller-meta-left">
              <div className="seller-avatar-badge">
                <UserRound size={20} />
              </div>
              <div>
                <span className="seller-sub-kicker">VERIFIED SHOWROOM / SELLER</span>
                <h4 className="seller-name-heading">{car.sellerName || car.vendorName || 'Cars21 Certified Hub'}</h4>
                <div className="seller-loc-pill">
                  <MapPin size={13} /> {car.city}{car.area ? `, ${car.area}` : ''} · Standardized Diagnostic Hub
                </div>
              </div>
            </div>
            <div className="seller-actions-right">
              <RevealPhoneButton carId={car.id} vendorSlug={car.vendorSlug || undefined} />
              {car.vendorSlug && (
                <Link to={`/dealers/${car.vendorSlug}`} className="button button-outline button-small">
                  View Showroom <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>

          {/* Key Specifications Bento Grid */}
          <div className="detail-bento-specs">
            <div className="spec-tile-item">
              <div className="tile-icon"><Calendar size={18} /></div>
              <div className="tile-info">
                <small>Reg. Year</small>
                <b>{car.year}</b>
              </div>
            </div>
            <div className="spec-tile-item">
              <div className="tile-icon"><Gauge size={18} /></div>
              <div className="tile-info">
                <small>Kilometers</small>
                <b>{(car.km).toLocaleString('en-IN')} km</b>
              </div>
            </div>
            <div className="spec-tile-item">
              <div className="tile-icon"><Fuel size={18} /></div>
              <div className="tile-info">
                <small>Fuel Type</small>
                <b>{car.fuel}</b>
              </div>
            </div>
            <div className="spec-tile-item">
              <div className="tile-icon"><Settings2 size={18} /></div>
              <div className="tile-info">
                <small>Transmission</small>
                <b>{car.transmission}</b>
              </div>
            </div>
            <div className="spec-tile-item">
              <div className="tile-icon"><UserRound size={18} /></div>
              <div className="tile-info">
                <small>Ownership</small>
                <b>{car.owners} {car.owners > 1 ? 'Owners' : '1st Owner'}</b>
              </div>
            </div>
            <div className="spec-tile-item">
              <div className="tile-icon"><MapPin size={18} /></div>
              <div className="tile-info">
                <small>Location & RTO</small>
                <b>{car.city}</b>
              </div>
            </div>
          </div>

          {/* 4 Pillars of Cars21 Assurance */}
          <div className="detail-assurance-strip">
            <div className="assurance-box">
              <div className="ass-icon"><ShieldCheck size={20} /></div>
              <div>
                <b>140-Point Inspection</b>
                <span>Pass certificate included</span>
              </div>
            </div>
            <div className="assurance-box">
              <div className="ass-icon"><RotateCcw size={20} /></div>
              <div>
                <b>7-Day Money Back</b>
                <span>100% refund, no questions</span>
              </div>
            </div>
            <div className="assurance-box">
              <div className="ass-icon"><Wrench size={20} /></div>
              <div>
                <b>1-Year Warranty</b>
                <span>Engine & gearbox protected</span>
              </div>
            </div>
            <div className="assurance-box">
              <div className="ass-icon"><FileText size={20} /></div>
              <div>
                <b>Guaranteed RC Transfer</b>
                <span>Completely hassle-free</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Decision & Booking Hub */}
        <div className="detail-hero-right">
          <div className="sticky-booking-hub-card">
            {/* Title & Badge */}
            <div className="hub-header">
              <div className="hub-badge-row">
                <span className="hub-certified-pill">
                  <ShieldCheck size={13} /> {car.badge || 'Cars21 Certified'}
                </span>
                <span className="hub-score-pill">
                  {car.score || 98}/100 Health
                </span>
              </div>
              <h1 className="hub-car-title">{car.year} {car.make} {car.model}</h1>
              <p className="hub-variant-sub">{car.variant} · {car.color} Exterior</p>
            </div>

            {/* Pricing Box */}
            <div className="hub-price-box">
              <div className="price-main-row">
                <span className="price-figure">{formatINR(car.price)}</span>
                <span className="price-tag-fixed">Fixed Price Assurance</span>
              </div>
              <div className="hub-emi-strip">
                <span>EMI starting from <b>{formatINR(emiVal)}/mo</b></span>
                <Link to="/loans24/emi-calculator" className="emi-calc-link">
                  EMI Calculator <ArrowRight size={12} />
                </Link>
              </div>
              <div className="zero-down-note">
                <Sparkles size={13} className="text-orange" />
                <span>Zero downpayment financing available from top 12 partner banks.</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="hub-actions-cluster">
              <a href="#booking-form" className="button button-orange button-full cta-book-btn">
                Book Free Test Drive / Visit <ArrowRight size={16} />
              </a>
              <button 
                type="button" 
                className={`button button-outline button-full cta-save-btn ${saved ? 'is-saved' : ''}`}
                onClick={() => void toggleWishlist(car.id)}
                disabled={loadingBuyer}
              >
                <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
                <span>{saved ? 'Vehicle Saved to Wishlist' : 'Save to Wishlist'}</span>
              </button>
            </div>

            {/* Direct Booking / Enquiry Form */}
            <div id="booking-form" className="hub-enquiry-container">
              {buyer ? (
                <form className="hub-enquiry-form" onSubmit={submitEnquiry}>
                  <div className="enquiry-form-title">
                    <Calendar size={16} />
                    <span>Schedule Free Test Drive</span>
                  </div>
                  <div className="form-fields-stack">
                    <label className="field-group-label">
                      <span>Full Name</span>
                      <input name="name" required defaultValue={buyer.name} placeholder="Your full name" className="hub-input" />
                    </label>
                    <label className="field-group-label">
                      <span>Phone Number (for WhatsApp update)</span>
                      <input name="phone" type="tel" required pattern="\\+?[\\d\\s()-]{10,18}" placeholder="+91 98765 43210" className="hub-input" />
                    </label>
                    <div className="fields-split-row">
                      <label className="field-group-label">
                        <span>Preferred Date</span>
                        <input name="preferredDate" type="date" min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())} className="hub-input" />
                      </label>
                      <label className="field-group-label">
                        <span>City</span>
                        <input name="city" required defaultValue={car.city} className="hub-input" />
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="button button-primary button-full hub-submit-btn" disabled={enquiryState === 'saving'}>
                    {enquiryState === 'saving' ? 'Confirming Visit...' : 'Confirm Test Drive on WhatsApp'}
                    <ArrowRight size={15} />
                  </button>
                  {formMessage && (
                    <div className={`enquiry-feedback ${enquiryState === 'error' ? 'is-error' : 'is-success'}`}>
                      {enquiryState === 'saved' && <Check size={14} />}
                      <span>{formMessage}</span>
                    </div>
                  )}
                </form>
              ) : (
                <div className="hub-login-prompt">
                  <div className="prompt-icon"><Shield size={20} /></div>
                  <h4>Schedule Test Drive Online</h4>
                  <p>Sign in with your Google account for instantaneous slot booking and direct seller connection.</p>
                  <Link 
                    to={`/login?returnTo=${encodeURIComponent(`/car/${car.id}#booking-form`)}`} 
                    className="button button-primary button-full"
                  >
                    Continue with Google <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Lower Detailed Information Hub */}
      <section className="container detail-lower-section">
        <div className="luxury-tabs-bar">
          <button 
            type="button" 
            className={`luxury-tab-btn ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            Vehicle Overview
          </button>
          <button 
            type="button" 
            className={`luxury-tab-btn ${tab === 'inspection' ? 'active' : ''}`}
            onClick={() => setTab('inspection')}
          >
            140-Point Inspection Report
          </button>
          <button 
            type="button" 
            className={`luxury-tab-btn ${tab === 'assurance' ? 'active' : ''}`}
            onClick={() => setTab('assurance')}
          >
            Cars21 Assurance & Warranty
          </button>
          <button 
            type="button" 
            className={`luxury-tab-btn ${tab === 'specs' ? 'active' : ''}`}
            onClick={() => setTab('specs')}
          >
            Technical Specifications
          </button>
        </div>

        <div className="luxury-tab-content">
          {tab === 'overview' && (
            <div className="tab-pane-overview">
              <div className="overview-headline-box">
                <h2>About this {car.year} {car.make} {car.model}</h2>
                <p>
                  This vehicle has been verified by Cars21 diagnostic teams. Single handedly maintained, with genuine odometer readings and clear ownership documentation.
                </p>
                <div className="key-feature-tags">
                  <span className="feat-tag"><Check size={13} /> {car.owners} Previous Owner</span>
                  <span className="feat-tag"><Check size={13} /> {car.transmission} Transmission</span>
                  <span className="feat-tag"><Check size={13} /> {car.fuel} Engine</span>
                  <span className="feat-tag"><Check size={13} /> {car.color} Factory Finish</span>
                  <span className="feat-tag"><Check size={13} /> Registered in {car.city}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'inspection' && (
            <div className="tab-pane-inspection">
              <InspectionReport car={car} />
            </div>
          )}

          {tab === 'assurance' && (
            <div className="tab-pane-assurance">
              <div className="assurance-grid-cards">
                <div className="assurance-detail-card">
                  <div className="card-icon-circle"><RotateCcw size={24} /></div>
                  <h3>7-Day Money Back Guarantee</h3>
                  <p>Drive the car for 7 days or up to 500 km. If you are not completely satisfied for any reason, return it for a 100% full refund with zero cancellation charges.</p>
                </div>
                <div className="assurance-detail-card">
                  <div className="card-icon-circle"><Wrench size={24} /></div>
                  <h3>1-Year Comprehensive Warranty</h3>
                  <p>Covers engine assembly, transmission, gearbox, ECU, suspension, and high-value mechanical parts across 5,000+ authorized service centers nationwide.</p>
                </div>
                <div className="assurance-detail-card">
                  <div className="card-icon-circle"><FileText size={24} /></div>
                  <h3>Guaranteed RC & Ownership Transfer</h3>
                  <p>Our dedicated RTO concierge team manages the complete paperwork, police NOC verification, and ownership transfer directly to your name.</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'specs' && (
            <div className="tab-pane-specs">
              <div className="specs-table-grid">
                <div className="spec-item-row"><span>Make & Model</span><b>{car.make} {car.model}</b></div>
                <div className="spec-item-row"><span>Variant</span><b>{car.variant}</b></div>
                <div className="spec-item-row"><span>Manufacturing Year</span><b>{car.year}</b></div>
                <div className="spec-item-row"><span>Kilometers Run</span><b>{(car.km).toLocaleString('en-IN')} km</b></div>
                <div className="spec-item-row"><span>Fuel Type</span><b>{car.fuel}</b></div>
                <div className="spec-item-row"><span>Transmission</span><b>{car.transmission}</b></div>
                <div className="spec-item-row"><span>Registered City</span><b>{car.city}</b></div>
                <div className="spec-item-row"><span>Exterior Color</span><b>{car.color}</b></div>
                <div className="spec-item-row"><span>Ownership Serial</span><b>{car.owners} {car.owners > 1 ? 'Owners' : '1st Owner'}</b></div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recommended Similar Cars Section */}
      <section className="section container similar-cars-section">
        <SectionTitle eyebrow="RECOMMENDED VEHICLES" title="Similar Verified Cars You May Like" link="/buy-cars" />
        <div className="car-grid">
          {cars.filter(item => item.id !== car.id).slice(0, 4).map(item => (
            <CarCard key={item.id} car={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
