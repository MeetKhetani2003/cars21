'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Lock, Unlock, ShieldCheck, CheckCircle2, Calendar, Clock, MapPin, 
  Gauge, Fuel, Settings2, ArrowRight, ArrowUpRight, Heart, Sparkles, 
  Zap, CarFront, Sliders, X, Check, Banknote, Star, UserRound, Phone, 
  ChevronRight, AlertCircle, Info, Tag
} from 'lucide-react';
import { Link, useNavigate } from '../lib/navigation';
import type { Car } from '../data';
import { calcEmi, formatINR, formatShort } from '../data';
import { useBuyerExperience } from './BuyerExperienceProvider';

type FeaturedCarsSectionProps = {
  cars: Car[];
};

type ActiveModal = 
  | { type: 'test_drive'; car: Car }
  | { type: 'offer'; car: Car }
  | null;

export function FeaturedCarsSection({ cars: initialCars }: FeaturedCarsSectionProps) {
  const { buyer, openLoginModal, wishlistIds, toggleWishlist, loadingBuyer } = useBuyerExperience();
  const nav = useNavigate();

  // Inventory Filter State
  const [activeTab, setActiveTab] = useState<'all' | 'suv' | 'sedan' | 'ev' | 'budget' | 'score'>('all');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'km-asc' | 'score'>('recommended');

  // Modal State for Test Drive & Offer
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Test Drive Form State
  const [tdDate, setTdDate] = useState('Tomorrow');
  const [tdSlot, setTdSlot] = useState('01:00 PM – 03:00 PM');
  const [tdLocation, setTdLocation] = useState<'doorstep' | 'hub'>('doorstep');
  const [tdPhone, setTdPhone] = useState('');
  const [tdNotes, setTdNotes] = useState('');
  const [tdSubmitting, setTdSubmitting] = useState(false);
  const [tdConfirmed, setTdConfirmed] = useState(false);

  // Offer Form State
  const [offerAmount, setOfferAmount] = useState<number>(0);
  const [offerNotes, setOfferNotes] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerConfirmed, setOfferConfirmed] = useState(false);

  // Live Toast Notification
  const [toastMessage, setToastMessage] = useState<{ title: string; subtitle: string } | null>(null);

  // Show Toast Helper
  const showActionToast = (title: string, subtitle: string) => {
    setToastMessage({ title, subtitle });
    setTimeout(() => {
      setToastMessage(prev => (prev?.title === title ? null : prev));
    }, 4500);
  };

  // Sync phone from buyer profile if available
  useEffect(() => {
    if (buyer?.phone) {
      setTdPhone(buyer.phone);
    }
  }, [buyer]);

  // Synchronize selected city with global city changes and localStorage
  const [cityOptions, setCityOptions] = useState<string[]>([
    'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Ahmedabad', 'Kolkata'
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cars21_city');
      if (saved) {
        setSelectedCity(saved === 'All Cities' || saved === 'Pan-India' ? 'All' : saved);
      }
    } catch {}

    const handleGlobalCityChange = (e: any) => {
      const newCity = e?.detail?.city || 'All';
      setSelectedCity(newCity === 'All Cities' || newCity === 'Pan-India' ? 'All' : newCity);
    };

    window.addEventListener('cars21:city-change', handleGlobalCityChange);
    return () => window.removeEventListener('cars21:city-change', handleGlobalCityChange);
  }, []);

  // Fetch active listed cities dynamically
  useEffect(() => {
    const set = new Set<string>();
    initialCars.forEach(c => {
      if (c.city) set.add(c.city);
    });
    ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Ahmedabad', 'Kolkata'].forEach(c => set.add(c));

    fetch('/api/admin/cities')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data?.cities)) {
          data.cities.forEach((c: any) => {
            if (c.name && c.active !== false) set.add(c.name);
          });
        }
        setCityOptions(Array.from(set).sort());
      })
      .catch(() => {
        setCityOptions(Array.from(set).sort());
      });
  }, [initialCars]);

  // Record an action in the database
  const captureUserAction = async (payload: {
    action: 'car_view' | 'test_drive' | 'express_interest';
    carId: string;
    preferredDate?: string;
    preferredSlot?: string;
    locationType?: 'doorstep' | 'hub';
    interestType?: 'offer' | 'reserve' | 'callback' | 'general';
    offerAmount?: number;
    phone?: string;
    notes?: string;
  }) => {
    if (!buyer) return false;
    try {
      const response = await fetch('/api/user/actions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Handle Car Details View
  const handleViewDetails = async (car: Car, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!buyer) {
      showActionToast('🔒 Login Required', 'Please sign in to unlock full 140-point diagnostics & history.');
      openLoginModal(`/car/${car.id}`);
      return;
    }

    // Log the user action
    showActionToast('📌 Action Captured', `Viewing verified diagnostics for ${car.year} ${car.make} ${car.model}.`);
    void captureUserAction({ action: 'car_view', carId: car.id });
    
    // Navigate smoothly
    nav(`/car/${car.id}`);
  };

  // Handle Book Test Drive Click
  const handleTestDriveClick = (car: Car) => {
    if (!buyer) {
      showActionToast('🔒 Login Required', 'Sign in with Google to schedule a free doorstep test drive.');
      openLoginModal();
      return;
    }
    setTdDate('Tomorrow');
    setTdSlot('01:00 PM – 03:00 PM');
    setTdLocation('doorstep');
    setTdPhone(buyer.phone || '');
    setTdNotes('');
    setTdConfirmed(false);
    setActiveModal({ type: 'test_drive', car });
  };

  // Submit Test Drive
  const handleConfirmTestDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || activeModal.type !== 'test_drive') return;
    setTdSubmitting(true);

    const car = activeModal.car;
    const ok = await captureUserAction({
      action: 'test_drive',
      carId: car.id,
      preferredDate: tdDate,
      preferredSlot: tdSlot,
      locationType: tdLocation,
      phone: tdPhone,
      notes: tdNotes
    });

    // Also attempt sending an inquiry so dealer/ops are notified
    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId: car.id,
          name: buyer?.name || 'Cars21 Member',
          phone: tdPhone || '9876543210',
          email: buyer?.email || '',
          city: car.city || 'Bengaluru',
          message: `Booked test drive: ${tdLocation === 'doorstep' ? 'Doorstep Delivery' : 'Cars21 Hub'}, Slot: ${tdDate} ${tdSlot}. Notes: ${tdNotes || 'None'}`
        })
      });
    } catch {}

    setTdSubmitting(false);
    setTdConfirmed(true);
    showActionToast('🎉 Test Drive Confirmed', `Action recorded! Our concierge will arrive at ${tdDate} (${tdSlot}).`);
  };

  // Handle Make Offer Click
  const handleOfferClick = (car: Car) => {
    if (!buyer) {
      showActionToast('🔒 Login Required', 'Sign in with Google to make an offer or reserve this car.');
      openLoginModal();
      return;
    }
    setOfferAmount(Math.round(car.price * 0.96)); // suggest 4% below asking
    setOfferNotes('');
    setOfferConfirmed(false);
    setActiveModal({ type: 'offer', car });
  };

  // Submit Offer
  const handleConfirmOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || activeModal.type !== 'offer') return;
    setOfferSubmitting(true);

    const car = activeModal.car;
    await captureUserAction({
      action: 'express_interest',
      carId: car.id,
      interestType: 'offer',
      offerAmount: offerAmount,
      phone: buyer?.phone || '',
      notes: offerNotes
    });

    setOfferSubmitting(false);
    setOfferConfirmed(true);
    showActionToast('💼 Offer Logged', `Your offer of ${formatINR(offerAmount)} has been recorded in your account.`);
  };

  // Filter and Sort inventory
  const filteredCars = useMemo(() => {
    let result = [...initialCars];

    // Filter by Tab
    if (activeTab === 'suv') result = result.filter(c => c.body === 'SUV');
    else if (activeTab === 'sedan') result = result.filter(c => c.body === 'Sedan');
    else if (activeTab === 'ev') result = result.filter(c => c.fuel === 'Electric' || c.body === 'Electric' || c.fuel === 'Hybrid');
    else if (activeTab === 'budget') result = result.filter(c => c.price <= 1000000);
    else if (activeTab === 'score') result = result.filter(c => (c.score || 90) >= 95);

    // Filter by City
    if (selectedCity !== 'All') {
      result = result.filter(c => c.city.toLowerCase() === selectedCity.toLowerCase());
    }

    // Sort
    if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'km-asc') result.sort((a, b) => a.km - b.km);
    else if (sortBy === 'score') result.sort((a, b) => (b.score || 0) - (a.score || 0));

    return result.slice(0, 8); // Display top 8 high-impact cars
  }, [initialCars, activeTab, selectedCity, sortBy]);

  // Tab Counts for Informative Badges
  const tabCounts = useMemo(() => {
    return {
      all: initialCars.length,
      suv: initialCars.filter(c => c.body === 'SUV').length,
      sedan: initialCars.filter(c => c.body === 'Sedan').length,
      ev: initialCars.filter(c => c.fuel === 'Electric' || c.body === 'Electric' || c.fuel === 'Hybrid').length,
      budget: initialCars.filter(c => c.price <= 1000000).length,
      score: initialCars.filter(c => (c.score || 90) >= 95).length,
    };
  }, [initialCars]);

  return (
    <section className="featured-showcase-section">
      <div className="container">
        
        {/* PREMIUM SECTION HEADER */}
        <div className="featured-section-header">
          <div className="featured-header-content">
            <div className="featured-eyebrow-row">
              <span className="featured-eyebrow-pill">
                <Sparkles size={13} className="eyebrow-sparkle" />
                VERIFIED SPOTLIGHT
              </span>
              <span className="featured-live-badge">
                <span className="live-pulse-dot" />
                {selectedCity === 'All' ? '2,450+ Certified Cars Pan-India' : `Certified Cars in ${selectedCity} & Nearby Hubs`}
              </span>
            </div>

            <h2 className="featured-main-title">
              Handpicked, Certified Vehicles <br className="hidden-mobile" />
              <span className="title-gradient-orange">Ready for Immediate Delivery.</span>
            </h2>

            <p className="featured-main-desc">
              Every car passes 140+ rigorous digital diagnostics, includes transparent service history, 
              a 7-day unconditional money-back guarantee, and free 1-year comprehensive warranty.
            </p>

            {/* TRUST PILLARS STRIP */}
            <div className="featured-pillars-strip">
              <span className="pillar-item">
                <ShieldCheck size={15} /> 140-Point Diagnostic Passed
              </span>
              <span className="pillar-bullet">•</span>
              <span className="pillar-item">
                <Clock size={15} /> 7-Day Unconditional Refund
              </span>
              <span className="pillar-bullet">•</span>
              <span className="pillar-item">
                <Zap size={15} /> Free Doorstep Test Drive
              </span>
              <span className="pillar-bullet">•</span>
              <span className="pillar-item">
                <Banknote size={15} /> Zero Down Payment Financing
              </span>
            </div>
          </div>

          <div className="featured-header-action">
            <Link href="/buy-cars" className="button button-outline featured-explore-all-btn">
              <span>View All 2,450+ Cars</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* LOGIN GATE LOCK STATUS STRIP */}
        <div className="featured-auth-gate-bar">
          {buyer ? (
            <div className="auth-gate-card logged-in">
              <div className="gate-left">
                <div className="gate-status-avatar">
                  <ShieldCheck size={20} className="icon-shield-unlocked" />
                </div>
                <div className="gate-info-text">
                  <div className="gate-title-row">
                    <b>VIP Certified Access Active: Welcome, {buyer.name}!</b>
                    <span className="unlocked-pill">
                      <Unlock size={12} /> All Reports Unlocked
                    </span>
                  </div>
                  <p>
                    Full 140-point diagnostics, transparent condition scores, and doorstep test drive scheduling 
                    are unlocked. Your interactions are automatically captured to your profile.
                  </p>
                </div>
              </div>
              <div className="gate-right">
                <Link href="/account" className="button button-small button-outline gate-account-btn">
                  <UserRound size={14} />
                  <span>My Activity Log</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="auth-gate-card locked">
              <div className="gate-left">
                <div className="gate-status-avatar locked-avatar">
                  <Lock size={20} className="icon-lock-gold" />
                </div>
                <div className="gate-info-text">
                  <div className="gate-title-row">
                    <b>Member-Exclusive Certified Access</b>
                    <span className="locked-pill">
                      <Lock size={12} /> Sign-in Required
                    </span>
                  </div>
                  <p>
                    Sign in with your Google account to unlock complete 140-point diagnostic reports, 
                    verified odometer records, transparent owner history, and instant doorstep test drive bookings.
                  </p>
                </div>
              </div>
              <div className="gate-right">
                <button 
                  type="button" 
                  onClick={() => openLoginModal()} 
                  className="button button-orange button-small gate-signin-btn"
                >
                  <Unlock size={14} />
                  <span>Sign In to Unlock Cars</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* INTERACTIVE CONTROLS BAR: CATEGORY TABS & CITY FILTER */}
        <div className="featured-controls-bar">
          <div className="featured-category-pills" role="tablist">
            <button
              type="button"
              className={`feat-pill ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <CarFront size={14} /> All Featured <span className="feat-pill-count">{tabCounts.all}</span>
            </button>
            <button
              type="button"
              className={`feat-pill ${activeTab === 'suv' ? 'active' : ''}`}
              onClick={() => setActiveTab('suv')}
            >
              🚙 SUVs <span className="feat-pill-count">{tabCounts.suv}</span>
            </button>
            <button
              type="button"
              className={`feat-pill ${activeTab === 'sedan' ? 'active' : ''}`}
              onClick={() => setActiveTab('sedan')}
            >
              🏎️ Sedans <span className="feat-pill-count">{tabCounts.sedan}</span>
            </button>
            <button
              type="button"
              className={`feat-pill ${activeTab === 'ev' ? 'active' : ''}`}
              onClick={() => setActiveTab('ev')}
            >
              ⚡ EVs &amp; Hybrids <span className="feat-pill-count">{tabCounts.ev}</span>
            </button>
            <button
              type="button"
              className={`feat-pill ${activeTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveTab('budget')}
            >
              💰 Under ₹10L <span className="feat-pill-count">{tabCounts.budget}</span>
            </button>
            <button
              type="button"
              className={`feat-pill ${activeTab === 'score' ? 'active' : ''}`}
              onClick={() => setActiveTab('score')}
            >
              ⭐ Score 95+ <span className="feat-pill-count">{tabCounts.score}</span>
            </button>
          </div>

          <div className="featured-secondary-filters">
            <div className="feat-select-wrap">
              <MapPin size={13} />
              <select 
                aria-label="Filter city"
                value={selectedCity} 
                onChange={e => {
                  const val = e.target.value;
                  setSelectedCity(val);
                  try {
                    localStorage.setItem('cars21_city', val === 'All' ? 'All Cities' : val);
                    window.dispatchEvent(new CustomEvent('cars21:city-change', { detail: { city: val } }));
                  } catch {}
                }}
              >
                <option value="All">All Cities / Pan-India</option>
                {cityOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="feat-select-wrap">
              <Sliders size={13} />
              <select 
                aria-label="Sort inventory"
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="km-asc">Lowest Mileage</option>
                <option value="score">Inspection Score</option>
              </select>
            </div>
          </div>
        </div>

        {/* CARDS GRID */}
        {filteredCars.length > 0 ? (
          <div className="featured-cards-grid">
            {filteredCars.map(car => {
              const saved = wishlistIds.includes(car.id);
              const emiVal = Math.round(calcEmi(car.price * 0.8, 10.5, 60));
              const savingsAmount = Math.round(car.price * 0.35); // estimated savings vs new

              return (
                <article key={car.id} className="featured-car-card">
                  
                  {/* CARD IMAGE STAGE */}
                  <div className="card-image-stage">
                    <button 
                      type="button"
                      className="image-click-target"
                      onClick={(e) => handleViewDetails(car, e)}
                      aria-label={`View ${car.year} ${car.make} ${car.model}`}
                    >
                      <img 
                        src={car.image} 
                        alt={`${car.year} ${car.make} ${car.model}`}
                        loading="lazy" 
                        className="card-main-photo" 
                      />
                    </button>

                    {/* TOP BADGES */}
                    <div className="card-top-badges">
                      <span className="card-assured-tag">
                        <ShieldCheck size={12} /> Cars21 Assured
                      </span>
                      <span className="card-guarantee-tag">
                        7-Day Return
                      </span>
                    </div>

                    {/* WISHLIST BUTTON */}
                    <button
                      type="button"
                      className={`card-wishlist-btn ${saved ? 'active' : ''}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!buyer) {
                          showActionToast('🔒 Login Required', 'Sign in to save this vehicle to your wishlist.');
                          openLoginModal();
                          return;
                        }
                        const res = await toggleWishlist(car.id);
                        if (res === 'saved') {
                          showActionToast('❤️ Car Saved', `${car.year} ${car.make} ${car.model} added to wishlist.`);
                        } else if (res === 'removed') {
                          showActionToast('Car Removed', `${car.year} ${car.make} ${car.model} removed from wishlist.`);
                        }
                      }}
                      disabled={loadingBuyer}
                      aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
                    >
                      <Heart size={16} fill={saved ? '#ef4444' : 'none'} color={saved ? '#ef4444' : '#ffffff'} />
                    </button>

                    {/* BOTTOM BADGES OVER PHOTO */}
                    <div className="card-bottom-photo-badges">
                      <span className="card-photo-financing">
                        <Zap size={11} /> 0 Down Payment Eligible
                      </span>
                      <span className="card-photo-score">
                        <span className="score-dot" />
                        {car.score || 94}/100 Score
                      </span>
                    </div>

                    {/* LOCK OVERLAY WATERMARK IF NOT LOGGED IN */}
                    {!buyer && (
                      <div 
                        className="card-lock-watermark"
                        onClick={(e) => handleViewDetails(car, e)}
                        title="Click to sign in and unlock full vehicle report"
                      >
                        <Lock size={12} />
                        <span>Sign in to unlock inspection</span>
                      </div>
                    )}
                  </div>

                  {/* CARD BODY CONTENT */}
                  <div className="card-content-body">
                    
                    {/* TITLE ROW */}
                    <div className="card-title-header">
                      <div>
                        <h3 
                          className="car-title-link" 
                          onClick={(e) => handleViewDetails(car, e)}
                        >
                          {car.year} {car.make} {car.model}
                        </h3>
                        <p className="car-variant-subtitle">
                          {car.variant}
                        </p>
                      </div>

                      <div className="car-rating-tag" title="Cars21 Verified Inspection Score">
                        <Star size={12} className="star-icon" fill="currentColor" />
                        <span>4.9</span>
                      </div>
                    </div>

                    {/* AUTOMOTIVE SPECS CHIP GRID */}
                    <div className="card-specs-grid">
                      <div className="card-spec-item" title="Odometer reading">
                        <Gauge size={13} />
                        <span>{(car.km / 1000).toFixed(1)}k km</span>
                      </div>
                      <div className="card-spec-item" title="Fuel type">
                        <Fuel size={13} />
                        <span>{car.fuel}</span>
                      </div>
                      <div className="card-spec-item" title="Transmission">
                        <Settings2 size={13} />
                        <span>{car.transmission === 'Automatic' ? 'Auto' : 'Manual'}</span>
                      </div>
                      <div className="card-spec-item" title="Ownership count">
                        <UserRound size={13} />
                        <span>{car.owners} Owner{car.owners > 1 ? 's' : ''}</span>
                      </div>
                      <div className="card-spec-item" title="Location hub">
                        <MapPin size={13} />
                        <span>{car.city}</span>
                      </div>
                      <div className="card-spec-item highlight-warranty" title="Cars21 Warranty Coverage">
                        <ShieldCheck size={13} />
                        <span>1-Yr Warranty</span>
                      </div>
                    </div>

                    {/* PRICING & FINANCIAL INTELLIGENCE */}
                    <div className="card-pricing-block">
                      <div className="price-primary-col">
                        <span className="price-currency-tag">{formatINR(car.price)}</span>
                        <span className="savings-tag">Save ₹{(savingsAmount / 100000).toFixed(1)}L vs new</span>
                      </div>
                      <div className="price-emi-col">
                        <span className="emi-headline">EMI from <b>{formatINR(emiVal)}</b>/mo</span>
                        <span className="emi-meta">Zero downpayment options</span>
                      </div>
                    </div>

                    {/* 3-POINT QUALITY CHECKLIST */}
                    <div className="card-quality-strip">
                      <span className="quality-item"><Check size={11} /> 140-pt Diagnostics Passed</span>
                      <span className="quality-item"><Check size={11} /> Zero Accidental History</span>
                      <span className="quality-item"><Check size={11} /> Clear RC &amp; Docs</span>
                    </div>

                    {/* INTERACTIVE ACTIONS FOOTER WITH LOGIN LOCK */}
                    <div className="card-actions-footer">
                      {buyer ? (
                        <>
                          <div className="card-primary-actions-row">
                            <button
                              type="button"
                              onClick={(e) => handleViewDetails(car, e)}
                              className="button button-outline card-action-btn view-details-btn"
                            >
                              <span>View Full Report</span>
                              <ArrowUpRight size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTestDriveClick(car)}
                              className="button button-orange card-action-btn test-drive-btn"
                            >
                              <Calendar size={14} />
                              <span>Book Test Drive</span>
                            </button>
                          </div>

                          <div className="card-secondary-actions-row">
                            <button
                              type="button"
                              onClick={() => handleOfferClick(car)}
                              className="card-quick-link-btn"
                            >
                              <Tag size={12} /> Make an Offer
                            </button>
                            <span className="card-action-sep">•</span>
                            <span className="card-free-doorstep-badge">
                              <Zap size={11} /> Free Doorstep Delivery
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="card-locked-action-wrapper">
                          <button
                            type="button"
                            onClick={(e) => handleViewDetails(car, e)}
                            className="button button-full button-primary card-locked-login-btn"
                          >
                            <Lock size={15} />
                            <span>Login to View Report &amp; Book</span>
                            <ArrowRight size={14} />
                          </button>
                          <div className="card-lock-note">
                            <ShieldCheck size={12} />
                            <span>Free login unlocks instant test drive &amp; diagnostics</span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="featured-empty-box">
            <CarFront size={36} />
            <h4>No vehicles match this filter</h4>
            <p>Try resetting the city or category filter to discover more verified cars.</p>
            <button 
              type="button" 
              onClick={() => { setActiveTab('all'); setSelectedCity('All'); }}
              className="button button-small button-outline"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* BOTTOM SECTION PROMO BANNER */}
        <div className="featured-bottom-guarantee-banner">
          <div className="banner-badge-col">
            <div className="banner-icon-box">
              <ShieldCheck size={28} />
            </div>
            <div>
              <b>Cars21 100% Peace-of-Mind Guarantee</b>
              <p>7-day full refund if not completely satisfied, plus 12-month roadside assistance &amp; powertrain coverage.</p>
            </div>
          </div>
          <div className="banner-links-col">
            <Link href="/inspection" className="banner-link-pill">
              Learn about our 140-point inspection <ArrowRight size={14} />
            </Link>
          </div>
        </div>

      </div>

      {/* INTERACTIVE TEST DRIVE BOOKING MODAL */}
      {activeModal && activeModal.type === 'test_drive' && (
        <div className="feat-modal-backdrop" onClick={() => !tdSubmitting && setActiveModal(null)}>
          <div className="feat-modal-dialog" onClick={e => e.stopPropagation()}>
            <button 
              type="button" 
              className="feat-modal-close" 
              onClick={() => setActiveModal(null)} 
              disabled={tdSubmitting}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {tdConfirmed ? (
              <div className="feat-modal-success">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={44} className="text-green" />
                </div>
                <h3>Test Drive Scheduled!</h3>
                <p>
                  Our certified Cars21 concierge will bring the{' '}
                  <b>{activeModal.car.year} {activeModal.car.make} {activeModal.car.model}</b>{' '}
                  to your selected location on <b>{tdDate} ({tdSlot})</b>.
                </p>
                <div className="success-card-summary">
                  <div><span>Location:</span> <b>{tdLocation === 'doorstep' ? '🏠 Doorstep at Your Address' : '🏢 Cars21 City Hub'}</b></div>
                  <div><span>Contact:</span> <b>{tdPhone || buyer?.email}</b></div>
                  <div><span>Status:</span> <b style={{ color: '#059669' }}>Confirmed &amp; Activity Logged</b></div>
                </div>
                <button 
                  type="button" 
                  className="button button-primary button-full"
                  onClick={() => setActiveModal(null)}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmTestDrive} className="feat-modal-form">
                <div className="modal-header-car">
                  <img src={activeModal.car.image} alt={activeModal.car.model} className="modal-car-thumb" />
                  <div>
                    <span className="modal-eyebrow">FREE DOORSTEP TEST DRIVE</span>
                    <h4>{activeModal.car.year} {activeModal.car.make} {activeModal.car.model}</h4>
                    <span className="modal-car-price">{formatINR(activeModal.car.price)} · {activeModal.car.city}</span>
                  </div>
                </div>

                <div className="feat-form-section">
                  <label className="feat-form-label">Choose Experience Location</label>
                  <div className="feat-radio-group">
                    <button
                      type="button"
                      className={`feat-radio-tile ${tdLocation === 'doorstep' ? 'active' : ''}`}
                      onClick={() => setTdLocation('doorstep')}
                    >
                      <Zap size={16} />
                      <div>
                        <b>Free Doorstep Delivery</b>
                        <small>Car delivered directly to your home</small>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`feat-radio-tile ${tdLocation === 'hub' ? 'active' : ''}`}
                      onClick={() => setTdLocation('hub')}
                    >
                      <MapPin size={16} />
                      <div>
                        <b>Cars21 City Hub</b>
                        <small>Test drive at certified experience center</small>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="feat-form-row">
                  <div className="feat-form-field">
                    <label className="feat-form-label">Preferred Day</label>
                    <select value={tdDate} onChange={e => setTdDate(e.target.value)}>
                      <option value="Today">Today (within 2-3 hours)</option>
                      <option value="Tomorrow">Tomorrow</option>
                      <option value="This Saturday">This Saturday</option>
                      <option value="This Sunday">This Sunday</option>
                      <option value="Next Monday">Next Monday</option>
                    </select>
                  </div>

                  <div className="feat-form-field">
                    <label className="feat-form-label">Preferred Time Slot</label>
                    <select value={tdSlot} onChange={e => setTdSlot(e.target.value)}>
                      <option value="10:00 AM – 12:00 PM">10:00 AM – 12:00 PM</option>
                      <option value="01:00 PM – 03:00 PM">01:00 PM – 03:00 PM</option>
                      <option value="04:00 PM – 06:00 PM">04:00 PM – 06:00 PM</option>
                      <option value="06:30 PM – 08:30 PM">06:30 PM – 08:30 PM</option>
                    </select>
                  </div>
                </div>

                <div className="feat-form-field">
                  <label className="feat-form-label">Contact Phone Number</label>
                  <div className="feat-input-wrap">
                    <Phone size={15} />
                    <input 
                      type="tel" 
                      required
                      placeholder="Enter 10-digit mobile number" 
                      value={tdPhone} 
                      onChange={e => setTdPhone(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="feat-form-field">
                  <label className="feat-form-label">Delivery Instructions or Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Near Indiranagar Metro Station" 
                    value={tdNotes} 
                    onChange={e => setTdNotes(e.target.value)} 
                  />
                </div>

                <div className="feat-modal-footer">
                  <button 
                    type="submit" 
                    className="button button-orange button-full" 
                    disabled={tdSubmitting}
                  >
                    {tdSubmitting ? 'Confirming with Cars21 Concierge...' : 'Confirm Test Drive Booking'}
                    {!tdSubmitting && <ArrowRight size={16} />}
                  </button>
                  <small className="feat-modal-privacy">
                    <ShieldCheck size={12} /> No obligation to purchase · 100% Free · Action saved to your history.
                  </small>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* INTERACTIVE MAKE AN OFFER MODAL */}
      {activeModal && activeModal.type === 'offer' && (
        <div className="feat-modal-backdrop" onClick={() => !offerSubmitting && setActiveModal(null)}>
          <div className="feat-modal-dialog" onClick={e => e.stopPropagation()}>
            <button 
              type="button" 
              className="feat-modal-close" 
              onClick={() => setActiveModal(null)} 
              disabled={offerSubmitting}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {offerConfirmed ? (
              <div className="feat-modal-success">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={44} className="text-green" />
                </div>
                <h3>Offer Submitted Successfully!</h3>
                <p>
                  Your offer of <b>{formatINR(offerAmount)}</b> for the{' '}
                  <b>{activeModal.car.year} {activeModal.car.make} {activeModal.car.model}</b>{' '}
                  has been sent to our relationship manager and recorded in your account activity.
                </p>
                <button 
                  type="button" 
                  className="button button-primary button-full"
                  onClick={() => setActiveModal(null)}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmOffer} className="feat-modal-form">
                <div className="modal-header-car">
                  <img src={activeModal.car.image} alt={activeModal.car.model} className="modal-car-thumb" />
                  <div>
                    <span className="modal-eyebrow">SUBMIT PRICE OFFER</span>
                    <h4>{activeModal.car.year} {activeModal.car.make} {activeModal.car.model}</h4>
                    <span className="modal-car-price">Listed at {formatINR(activeModal.car.price)}</span>
                  </div>
                </div>

                <div className="feat-form-field">
                  <label className="feat-form-label">Your Proposed Offer Amount (₹)</label>
                  <div className="feat-input-wrap">
                    <Banknote size={16} />
                    <input 
                      type="number" 
                      required
                      min={Math.round(activeModal.car.price * 0.7)}
                      max={activeModal.car.price * 1.1}
                      step={5000}
                      value={offerAmount || ''} 
                      onChange={e => setOfferAmount(Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="feat-offer-presets">
                  <span className="preset-label">Quick proposals:</span>
                  {[
                    { pct: 0.97, label: '3% Off' },
                    { pct: 0.95, label: '5% Off' },
                    { pct: 0.92, label: '8% Off' },
                  ].map(p => {
                    const val = Math.round(activeModal.car.price * p.pct / 5000) * 5000;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        className="feat-preset-btn"
                        onClick={() => setOfferAmount(val)}
                      >
                        {p.label} ({formatShort(val)})
                      </button>
                    );
                  })}
                </div>

                <div className="feat-form-field">
                  <label className="feat-form-label">Offer Notes or Comments</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ready for immediate cash purchase or loan pre-approved" 
                    value={offerNotes} 
                    onChange={e => setOfferNotes(e.target.value)} 
                  />
                </div>

                <div className="feat-modal-footer">
                  <button 
                    type="submit" 
                    className="button button-orange button-full" 
                    disabled={offerSubmitting || !offerAmount}
                  >
                    {offerSubmitting ? 'Recording Offer...' : `Submit Offer of ${formatINR(offerAmount)}`}
                    {!offerSubmitting && <ArrowRight size={16} />}
                  </button>
                  <small className="feat-modal-privacy">
                    <ShieldCheck size={12} /> Binding only upon your final verification and test drive.
                  </small>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FLOATING ACTION TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="feat-action-toast" role="status">
          <div className="toast-icon-box">
            <CheckCircle2 size={18} />
          </div>
          <div className="toast-text-box">
            <b>{toastMessage.title}</b>
            <span>{toastMessage.subtitle}</span>
          </div>
          <button 
            type="button" 
            className="toast-close-btn" 
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss toast"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </section>
  );
}

