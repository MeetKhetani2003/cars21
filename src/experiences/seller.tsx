import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from '../lib/navigation';
import {
  ArrowRight,
  Award,
  Building2,
  Calendar,
  Camera,
  Car,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock,
  Download,
  FileText,
  Gauge,
  HelpCircle,
  Info,
  MapPin,
  Pencil,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  Zap
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHero, TrustStrip } from '../components/shared';
import { formatINR } from '../data';
import { estimateCarValuation, parseRegistration, ValuationInput, ValuationResult } from '../lib/valuation';
import { SellCarInquiryForm } from '../components/SellCarInquiryForm';

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

const DEFAULT_METROS: CityItem[] = [
  { id: 'junagadh-ho', name: 'Junagadh', state: 'Gujarat', pincode: '362001', popular: true },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', pincode: '560001', popular: true },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', pincode: '400001', popular: true },
  { id: 'delhi-ncr', name: 'Delhi NCR', state: 'Delhi', pincode: '110001', popular: true },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', pincode: '500001', popular: true },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', pincode: '411001', popular: true },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', pincode: '380001', popular: true },
];

// ============================================================================
// STEP 1: SELL PAGE (Start with Registration or Skip)
// ============================================================================
export function SellPage({ initialTab }: { initialTab?: 'inquiry' | 'valuation' } = {}) {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<'inquiry' | 'valuation'>(initialTab || 'inquiry');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<{ registration: string }>({
    resolver: zodResolver(
      z.object({
        registration: z.string().trim().min(4, 'Enter a valid registration number to continue.').max(14, 'Use up to 14 characters.')
      })
    ),
    defaultValues: { registration: '' }
  });

  return (
    <>
      <PageHero
        eyebrow="CARS21 VERIFIED SELLER NETWORK"
        title="Sell Your Car at the Best Market Price"
        copy="Submit your car dossier with 5-angle photos and RC book for direct dealer offers, or calculate instant algorithmic valuation."
      />

      <div className="container" style={{ paddingTop: '28px' }}>
        {/* Tab Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 32px', maxWidth: '640px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('inquiry')}
            style={{
              flex: 1,
              minHeight: '44px',
              borderRadius: '12px',
              border: 0,
              background: activeTab === 'inquiry' ? '#ffffff' : 'transparent',
              color: activeTab === 'inquiry' ? '#ea580c' : '#64748b',
              fontWeight: 800,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'inquiry' ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.18s ease',
              cursor: 'pointer'
            }}
          >
            <Camera size={16} /> Direct Sell Inquiry (Photos &amp; RC Book)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('valuation')}
            style={{
              flex: 1,
              minHeight: '44px',
              borderRadius: '12px',
              border: 0,
              background: activeTab === 'valuation' ? '#ffffff' : 'transparent',
              color: activeTab === 'valuation' ? '#2563eb' : '#64748b',
              fontWeight: 800,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'valuation' ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.18s ease',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={16} /> Instant AI Valuation Lookup
          </button>
        </div>

        {activeTab === 'inquiry' ? (
          <div style={{ maxWidth: '980px', margin: '0 auto 60px' }}>
            <SellCarInquiryForm />
          </div>
        ) : (
          <section className="sell-layout" style={{ margin: '0 auto 60px' }}>
            <div className="sell-form-card">
              <div className="step-kicker">
                <span>01</span> START WITH YOUR REGISTRATION
              </div>
              <h2>What car do you drive?</h2>
              <p>
                Enter your vehicle registration number for instant RTO parsing and certified market valuation.
              </p>

              <form
                onSubmit={handleSubmit(({ registration }) =>
                  nav(`/sell-car/vehicle-details?reg=${encodeURIComponent(registration.toUpperCase().trim())}`)
                )}
              >
                <label className="field-label">
                  Vehicle Registration Number
                  <input
                    {...register('registration')}
                    placeholder="e.g. GJ 03 AB 1234 or KA 05 MN 2023"
                    maxLength={14}
                    style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}
                  />
                </label>
                {errors.registration && <span className="field-error">{errors.registration.message}</span>}

                <span className="field-help">
                  <ShieldCheck size={14} /> Instant RTO lookup &amp; live transaction valuation across 6 metros.
                </span>

                <button type="submit" className="button button-primary button-full" style={{ marginTop: '12px' }}>
                  Check Instant Valuation <ArrowRight size={16} />
                </button>
              </form>

              <div className="sample-tip" style={{ marginTop: '20px' }}>
                <b>Try a sample plate:</b>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <button type="button" onClick={() => setValue('registration', 'GJ03AB2023', { shouldValidate: true })}>
                    GJ 03 AB 2023 (Junagadh)
                  </button>
                  <button type="button" onClick={() => setValue('registration', 'KA03MN2022', { shouldValidate: true })}>
                    KA 03 MN 2022 (Bengaluru)
                  </button>
                  <button type="button" onClick={() => setValue('registration', 'MH02CB2024', { shouldValidate: true })}>
                    MH 02 CB 2024 (Mumbai)
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Don&apos;t know the registration number? </span>
                <Link
                  href="/sell-car/valuation"
                  style={{ fontSize: '13px', fontWeight: 700, color: '#ff5c00', textDecoration: 'none' }}
                >
                  Select by Car Model instead →
                </Link>
              </div>
            </div>

            <div className="sell-aside">
              <div className="sell-aside-image">
                <img src="/images/kars21-hero.png" alt="Cars21 certified valuation" />
              </div>
              <div className="sell-aside-points">
                <h3>How Cars21 Valuation Works</h3>
                {[
                  'Ex-showroom price calibration across 17 manufacturers',
                  'Real odometer & condition degradation analysis',
                  'Instant cash payout vs direct private sale comparison',
                  'Free doorstep inspection with 30-min bank payout',
                ].map((x, i) => (
                  <div className="compact-step" key={x}>
                    <span>{i + 1}</span>
                    <p>{x}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="container">
        <TrustStrip />
      </div>
    </>
  );
}

// ============================================================================
// STEP 2: VEHICLE DETAILS PAGE (Dynamic Makes & 2022-2026 Models)
// ============================================================================
export function VehicleDetailsPage() {
  const [search] = useSearchParams();
  const nav = useNavigate();

  const [makes, setMakes] = useState<MakeItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>(DEFAULT_METROS);
  const [selectedMake, setSelectedMake] = useState('Hyundai');
  const [selectedModel, setSelectedModel] = useState('');

  const regParam = search.get('reg') || search.get('registration') || '';
  const parsedReg = useMemo(() => parseRegistration(regParam), [regParam]);

  useEffect(() => {
    // Fetch dynamic makes and models
    fetch('/api/admin/makes')
      .then(res => res.json())
      .then(data => {
        if (data.makes && data.makes.length > 0) {
          setMakes(data.makes);
          if (!selectedMake) setSelectedMake(data.makes[0].name);
        }
      })
      .catch(() => {});

    // Fetch dynamic cities
    fetch('/api/admin/cities')
      .then(res => res.json())
      .then(data => {
        if (data.cities && data.cities.length > 0) {
          setCities(data.cities);
        }
      })
      .catch(() => {});
  }, []);

  // Filter models for selected make
  const currentMakeObj = makes.find(m => m.name.toLowerCase() === selectedMake.toLowerCase());
  const availableModels = currentMakeObj?.models || [];

  useEffect(() => {
    if (availableModels.length > 0 && (!selectedModel || !availableModels.some(m => m.name.toLowerCase() === selectedModel.toLowerCase()))) {
      setSelectedModel(availableModels[0].name);
    }
  }, [selectedMake, availableModels]);

  function continueToEstimate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => params.set(key, String(value)));
    nav(`/sell-car/valuation?${params.toString()}`);
  }

  return (
    <>
      <PageHero
        eyebrow="SELL YOUR CAR · STEP 2 OF 4"
        title="Confirm vehicle specifications."
        copy="Accurate specifications help our valuation engine reference authentic dealer auction bids and regional market benchmarks."
      />

      <section className="container form-page-layout">
        <div className="form-card">
          <div className="progress-track">
            <span style={{ width: '50%' }} />
          </div>

          {parsedReg.state && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '12.5px', color: '#1e40af', fontWeight: 600 }}>
                Registration detected: <strong>{regParam}</strong> · RTO Region: <strong>{parsedReg.state}</strong> ({parsedReg.code})
              </span>
            </div>
          )}

          <form onSubmit={continueToEstimate}>
            <div className="field-grid">
              <label className="field-label">
                Registration Number
                <input
                  name="registration"
                  required
                  defaultValue={regParam}
                  placeholder="e.g. GJ 03 AB 1234"
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                />
              </label>

              <label className="field-label">
                City / Location
                <select name="city" defaultValue={parsedReg.defaultCity || 'Bengaluru'}>
                  {cities.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name}{c.pincode ? ` (${c.pincode})` : ''} - {c.state}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Company / Make
                <select
                  name="make"
                  value={selectedMake}
                  onChange={e => setSelectedMake(e.target.value)}
                  required
                >
                  {makes.length > 0 ? (
                    makes.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))
                  ) : (
                    ['Hyundai', 'Maruti Suzuki', 'Tata', 'Mahindra', 'Toyota', 'Honda', 'Kia', 'Volkswagen'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  )}
                </select>
              </label>

              <label className="field-label">
                Car Model
                <select
                  name="model"
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  required
                >
                  {availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} {m.body ? `(${m.body})` : ''}
                      </option>
                    ))
                  ) : (
                    ['Creta', 'Swift', 'Nexon', 'Brezza', 'Thar', 'City', 'Punch', 'Seltos'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  )}
                </select>
              </label>

              <label className="field-label">
                Manufacturing Year
                <select name="year" defaultValue="2023">
                  {Array.from({ length: 15 }, (_, i) => 2026 - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Kilometres Driven
                <input name="km" type="number" defaultValue="32000" min="0" max="2000000" required />
              </label>

              <label className="field-label">
                Fuel Type
                <select name="fuel" defaultValue="Petrol">
                  <option>Petrol</option>
                  <option>Diesel</option>
                  <option>Electric</option>
                  <option>CNG</option>
                  <option>Hybrid</option>
                </select>
              </label>

              <label className="field-label">
                Transmission
                <select name="transmission" defaultValue="Manual">
                  <option>Manual</option>
                  <option>Automatic</option>
                </select>
              </label>

              <label className="field-label">
                Previous Owners
                <select name="owners" defaultValue="1">
                  <option value="1">1st Owner</option>
                  <option value="2">2nd Owner</option>
                  <option value="3">3rd Owner</option>
                  <option value="4">4+ Owners</option>
                </select>
              </label>

              <label className="field-label">
                Overall Condition
                <select name="condition" defaultValue="Good">
                  <option value="Excellent">Excellent (Like new, zero scratches)</option>
                  <option value="Very Good">Very Good (Clean, minor wear)</option>
                  <option value="Good">Good (Normal city usage, fully working)</option>
                  <option value="Fair">Fair (Needs minor dent/paint work)</option>
                </select>
              </label>
            </div>

            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Link className="button button-outline" href="/sell-car">Back</Link>
              <button type="submit" className="button button-primary">
                Calculate Real Valuation <ArrowRight size={16} />
              </button>
            </div>
          </form>

          <p className="detail-disclosure">
            Cars21 algorithmic valuation engine cross-references real dealer auction bids and regional demand.
          </p>
        </div>

        <aside className="form-aside">
          <span className="step-aside-icon"><CarFront /></span>
          <h3>Why details matter</h3>
          <p>
            Manufacturer, model year, odometer mileage, ownership count, and fuel type each have distinct depreciation curves in the Indian automotive market.
          </p>
          <div className="step-aside-note">
            <ShieldCheck size={16} /> Transparent calculation with no hidden markdowns.
          </div>
        </aside>
      </section>
    </>
  );
}

// ============================================================================
// STEP 3: REAL AUTOMOTIVE VALUATION CHECK DASHBOARD
// ============================================================================
export function ValuationPage() {
  const [search, setSearch] = useSearchParams();
  const nav = useNavigate();

  // Dynamic state loaded from URL or defaults
  const [make, setMake] = useState(search.get('make') || 'Hyundai');
  const [model, setModel] = useState(search.get('model') || 'Creta');
  const [year, setYear] = useState(Number(search.get('year') || 2023));
  const [km, setKm] = useState(Number(search.get('km') || 32000));
  const [condition, setCondition] = useState(search.get('condition') || 'Good');
  const [owners, setOwners] = useState(Number(search.get('owners') || 1));
  const [fuel, setFuel] = useState(search.get('fuel') || 'Petrol');
  const [transmission, setTransmission] = useState(search.get('transmission') || 'Manual');
  const [city, setCity] = useState(search.get('city') || 'Bengaluru');
  const [registration, setRegistration] = useState(search.get('registration') || search.get('reg') || '');

  // Makes & Cities data
  const [makesList, setMakesList] = useState<MakeItem[]>([]);
  const [citiesList, setCitiesList] = useState<CityItem[]>(DEFAULT_METROS);
  const [similarCars, setSimilarCars] = useState<any[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('11:00 AM');
  const [bookingMode, setBookingMode] = useState('Doorstep inspection');

  // Load makes & cities
  useEffect(() => {
    fetch('/api/admin/makes')
      .then(res => res.json())
      .then(data => {
        if (data.makes) setMakesList(data.makes);
      })
      .catch(() => {});

    fetch('/api/admin/cities')
      .then(res => res.json())
      .then(data => {
        if (data.cities) setCitiesList(data.cities);
      })
      .catch(() => {});
  }, []);

  // Compute live valuation via engine
  const valuation = useMemo<ValuationResult>(() => {
    const input: ValuationInput = {
      make,
      model,
      year,
      km,
      condition,
      owners,
      fuel,
      transmission,
      city,
      registration
    };
    return estimateCarValuation(input);
  }, [make, model, year, km, condition, owners, fuel, transmission, city, registration]);

  // Synchronize with API for matching database inventory
  useEffect(() => {
    let cancelled = false;
    setLoadingApi(true);

    fetch('/api/valuation/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        make,
        model,
        year,
        km,
        condition,
        owners,
        fuel,
        transmission,
        city,
        registration
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.similarCars) {
          setSimilarCars(data.similarCars);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingApi(false);
      });

    return () => {
      cancelled = true;
    };
  }, [make, model, year, km, condition, owners, fuel, transmission, city]);

  // Current make models
  const currentMakeObj = makesList.find(m => m.name.toLowerCase() === make.toLowerCase());
  const availableModels = currentMakeObj?.models || [];

  // Chart projection data
  const forecastChartData = [
    { period: 'Today (2026)', value: valuation.fairMarketValue },
    { period: '+6 Months', value: valuation.futureForecast.month6 },
    { period: '+12 Months', value: valuation.futureForecast.month12 },
    { period: '+24 Months', value: valuation.futureForecast.month24 }
  ];

  // Book Doorstep Inspection handler
  async function submitInspectionBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingSaving(true);
    setBookingError('');
    const form = new FormData(event.currentTarget);

    const payload = {
      registration: registration || 'Not provided',
      make,
      model,
      year,
      km,
      fuel,
      transmission,
      owners,
      condition,
      city,
      estimatedLow: valuation.marketRange.low,
      estimatedHigh: valuation.marketRange.high,
      inspectionMode: bookingMode,
      preferredDate: bookingDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
      preferredTime: bookingTime,
      address: String(form.get('address') || ''),
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      consent: true,
    };

    try {
      const res = await fetch('/api/seller-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Inspection request could not be submitted.');
      setBookingSuccess(true);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setBookingSaving(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="CARS21 ALGORITHMIC VALUATION ENGINE"
        title="Live Market Valuation Report"
        copy="Empirical market evaluation calculated from 2,400+ authentic Indian dealer transactions, regional demand index, and age-km wear schedules."
      />

      <section className="container val-dashboard-shell">
        <div className="val-dashboard-grid">
          {/* LEFT COLUMN: HERO VALUATION & ANALYTICS */}
          <div>
            {/* HERO CARD */}
            <div className="val-hero-card">
              <div className="val-hero-tag-row">
                <span
                  style={{
                    background: 'rgba(255, 92, 0, 0.22)',
                    color: '#ff7a29',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 92, 0, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Sparkles size={13} /> {valuation.confidenceScore}% Valuation Accuracy
                </span>

                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#34d399',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <TrendingUp size={13} /> {valuation.demandIndex} Demand in {city}
                </span>
              </div>

              <h1 className="val-vehicle-title">
                {year} {make} {model}
              </h1>

              <div className="val-vehicle-subtitle">
                <span>{km.toLocaleString('en-IN')} km</span>
                <span>•</span>
                <span>{fuel}</span>
                <span>•</span>
                <span>{transmission}</span>
                <span>•</span>
                <span>{owners} Owner{owners > 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{condition} Condition</span>
                {registration && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#ffffff', fontWeight: 700 }}>Plate: {registration.toUpperCase()}</span>
                  </>
                )}
              </div>

              {/* PRICE HIGHLIGHT BLOCK */}
              <div className="val-price-hero-block">
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 700 }}>
                    Estimated Fair Market Value
                  </div>
                  <div className="val-hero-price">
                    {formatINR(valuation.fairMarketValue)}
                  </div>
                  <div className="val-hero-range">
                    Indicative Market Range: <strong>{formatINR(valuation.marketRange.low)}</strong> – <strong>{formatINR(valuation.marketRange.high)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(true)}
                    className="button button-orange"
                    style={{ fontWeight: 800 }}
                  >
                    Sell at this Price <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="button button-outline"
                    style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.25)', padding: '0 12px' }}
                    title="Print or save Valuation Certificate"
                  >
                    <Printer size={15} /> Certificate
                  </button>
                </div>
              </div>
            </div>

            {/* 3 SELLING CHANNEL CARDS */}
            <div className="val-channels-grid">
              {/* Channel 1: Instant Cash */}
              <div className="val-channel-card featured">
                <div>
                  <span className="val-channel-badge orange">⚡ Instant Cash Payout</span>
                  <div className="val-channel-price">{formatINR(valuation.instantCashPrice)}</div>
                  <p className="val-channel-desc">
                    Sell directly to Cars21. Bank payout in 30 minutes, free doorstep pickup &amp; instant RC name transfer guarantee.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(true)}
                  className="button button-primary button-small button-full"
                >
                  Get Instant Payout
                </button>
              </div>

              {/* Channel 2: Fair Marketplace Value */}
              <div className="val-channel-card">
                <div>
                  <span className="val-channel-badge blue">🛡️ Marketplace Value</span>
                  <div className="val-channel-price">{formatINR(valuation.fairMarketValue)}</div>
                  <p className="val-channel-desc">
                    Certified marketplace price. Matched with 10,000+ verified retail car buyers looking for inspected vehicles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(true)}
                  className="button button-outline button-small button-full"
                >
                  List on Marketplace
                </button>
              </div>

              {/* Channel 3: Private Direct Sale */}
              <div className="val-channel-card">
                <div>
                  <span className="val-channel-badge slate">🤝 Private Direct Sale</span>
                  <div className="val-channel-price">{formatINR(valuation.privateSalePrice)}</div>
                  <p className="val-channel-desc">
                    Maximum potential return if you negotiate directly with private individual buyers over 2–4 weeks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(true)}
                  className="button button-outline button-small button-full"
                >
                  Explore Private Sale
                </button>
              </div>
            </div>

            {/* SCIENTIFIC BREAKDOWN WATERFALL */}
            <div className="val-breakdown-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                  Scientific Value Degradation Breakdown
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Benchmark Model Index</span>
              </div>

              <div className="val-breakdown-row">
                <span>Original Estimated Ex-Showroom Price</span>
                <strong>{formatINR(valuation.breakdown.baseExShowroom)}</strong>
              </div>

              <div className="val-breakdown-row deduction">
                <span>
                  Age Depreciation ({valuation.breakdown.ageDepreciationPercent}% degradation over {2026 - year} years)
                </span>
                <strong>- {formatINR(valuation.breakdown.ageDepreciationAmount)}</strong>
              </div>

              <div className={`val-breakdown-row ${valuation.breakdown.kmAdjustmentAmount >= 0 ? 'addition' : 'deduction'}`}>
                <span>
                  Odometer Usage Adjustment ({km.toLocaleString('en-IN')} km vs {Math.max(8000, (2026 - year) * 12000).toLocaleString('en-IN')} km benchmark)
                </span>
                <strong>
                  {valuation.breakdown.kmAdjustmentAmount >= 0 ? '+' : '-'} {formatINR(Math.abs(valuation.breakdown.kmAdjustmentAmount))}
                </strong>
              </div>

              {valuation.breakdown.ownershipAdjustmentAmount !== 0 && (
                <div className="val-breakdown-row deduction">
                  <span>Ownership Impact ({owners} Owner{owners > 1 ? 's' : ''})</span>
                  <strong>- {formatINR(Math.abs(valuation.breakdown.ownershipAdjustmentAmount))}</strong>
                </div>
              )}

              {valuation.breakdown.conditionAdjustmentAmount !== 0 && (
                <div className={`val-breakdown-row ${valuation.breakdown.conditionAdjustmentAmount > 0 ? 'addition' : 'deduction'}`}>
                  <span>Condition Adjustment ({condition})</span>
                  <strong>
                    {valuation.breakdown.conditionAdjustmentAmount > 0 ? '+' : '-'} {formatINR(Math.abs(valuation.breakdown.conditionAdjustmentAmount))}
                  </strong>
                </div>
              )}

              {valuation.breakdown.transmissionBonus > 0 && (
                <div className="val-breakdown-row addition">
                  <span>Automatic Transmission Resale Premium</span>
                  <strong>+ {formatINR(valuation.breakdown.transmissionBonus)}</strong>
                </div>
              )}

              <div className="val-breakdown-row" style={{ color: '#0f172a', borderTop: '2px solid #0f172a' }}>
                <span>Certified Fair Market Valuation</span>
                <span style={{ color: '#ff5c00', fontSize: '20px' }}>{formatINR(valuation.fairMarketValue)}</span>
              </div>
            </div>

            {/* 24-MONTH DEPRECIATION FORECAST */}
            <div className="val-forecast-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                    24-Month Future Value Retention Forecast
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Anticipated market depreciation curve if you hold the car over the next 1–2 years.
                  </p>
                </div>
                <TrendingDown size={22} style={{ color: '#dc2626' }} />
              </div>

              <div style={{ width: '100%', height: 180, marginTop: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData}>
                    <defs>
                      <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff5c00" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ff5c00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis hide domain={['dataMin - 50000', 'dataMax + 30000']} />
                    <Tooltip formatter={(val: any) => [formatINR(Number(val)), 'Valuation']} />
                    <Area type="monotone" dataKey="value" stroke="#ff5c00" strokeWidth={3} fill="url(#valGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="val-forecast-grid">
                <div className="val-forecast-item">
                  <div className="val-forecast-time">In 6 Months</div>
                  <div className="val-forecast-val">{formatINR(valuation.futureForecast.month6)}</div>
                  <div className="val-forecast-loss">
                    - {formatINR(valuation.fairMarketValue - valuation.futureForecast.month6)} loss
                  </div>
                </div>

                <div className="val-forecast-item">
                  <div className="val-forecast-time">In 12 Months</div>
                  <div className="val-forecast-val">{formatINR(valuation.futureForecast.month12)}</div>
                  <div className="val-forecast-loss">
                    - {formatINR(valuation.fairMarketValue - valuation.futureForecast.month12)} loss
                  </div>
                </div>

                <div className="val-forecast-item">
                  <div className="val-forecast-time">In 24 Months</div>
                  <div className="val-forecast-val">{formatINR(valuation.futureForecast.month24)}</div>
                  <div className="val-forecast-loss">
                    - {formatINR(valuation.fairMarketValue - valuation.futureForecast.month24)} loss
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', padding: '10px 14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Tip for sellers:</strong> Selling now avoids an estimated <strong>{formatINR(valuation.fairMarketValue - valuation.futureForecast.month12)}</strong> drop in value over the coming 12 months.
                </span>
              </div>
            </div>

            {/* SIMILAR CARS IN MARKETPLACE */}
            {similarCars.length > 0 && (
              <div style={{ marginTop: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '22px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '18px', color: '#0f172a' }}>
                  Live Inventory Comparison ({make} {model})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {similarCars.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        display: 'grid',
                        gap: '6px'
                      }}
                    >
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{c.year} {c.make} {c.model}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{c.variant || 'Certified'} · {c.city}</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#ff5c00', marginTop: '2px' }}>
                        {formatINR(c.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: INTERACTIVE REAL-TIME SPEC ADJUSTER */}
          <div className="val-aside-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span className="eyebrow" style={{ margin: 0 }}>REAL-TIME ADJUSTER</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>Explore &amp; Refine Specs</h3>
              </div>
              <Sliders size={18} style={{ color: '#ff5c00' }} />
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {/* Make & Model */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Manufacturer
                </label>
                <select
                  value={make}
                  onChange={e => setMake(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                >
                  {makesList.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Model
                </label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                >
                  {availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <option key={m.id} value={m.name}>{m.name} {m.body ? `(${m.body})` : ''}</option>
                    ))
                  ) : (
                    <option value={model}>{model}</option>
                  )}
                </select>
              </div>

              {/* Manufacturing Year */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Year: <strong>{year}</strong>
                </label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                >
                  {Array.from({ length: 15 }, (_, i) => 2026 - i).map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Kilometres with Interactive Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    Odometer (Kilometres)
                  </label>
                  <strong style={{ fontSize: '13px', color: '#ff5c00' }}>{km.toLocaleString('en-IN')} km</strong>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="160000"
                  step="2000"
                  value={km}
                  onChange={e => setKm(Number(e.target.value))}
                  className="val-adjuster-slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                  <span>5,000 km</span>
                  <span>80,000 km</span>
                  <span>1,60,000 km</span>
                </div>
              </div>

              {/* Condition */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Overall Condition
                </label>
                <select
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                >
                  <option value="Excellent">Excellent (+6% Value)</option>
                  <option value="Very Good">Very Good (+2% Value)</option>
                  <option value="Good">Good (Baseline Market)</option>
                  <option value="Fair">Fair (-10% Value)</option>
                </select>
              </div>

              {/* Fuel & Transmission */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Fuel
                  </label>
                  <select
                    value={fuel}
                    onChange={e => setFuel(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12px' }}
                  >
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>Electric</option>
                    <option>CNG</option>
                    <option>Hybrid</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Transmission
                  </label>
                  <select
                    value={transmission}
                    onChange={e => setTransmission(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12px' }}
                  >
                    <option>Manual</option>
                    <option>Automatic</option>
                  </select>
                </div>
              </div>

              {/* Owners & City */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Owners
                  </label>
                  <select
                    value={owners}
                    onChange={e => setOwners(Number(e.target.value))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12px' }}
                  >
                    <option value={1}>1st Owner</option>
                    <option value={2}>2nd Owner</option>
                    <option value={3}>3rd Owner</option>
                    <option value={4}>4+ Owners</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    City
                  </label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12px' }}
                  >
                    {citiesList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(true)}
                  className="button button-orange button-full"
                  style={{ fontWeight: 800 }}
                >
                  Book Free Doorstep Inspection
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                140-point diagnostics · Free doorstep inspection · No obligation to sell
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FREE DOORSTEP INSPECTION BOOKING MODAL
         ========================================================================= */}
      {bookingModalOpen && (
        <div
          className="management-modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setBookingModalOpen(false);
          }}
        >
          <section className="management-modal" role="dialog" aria-modal="true" style={{ maxWidth: '520px' }}>
            <header>
              <div>
                <h2 style={{ margin: 0, fontSize: '19px' }}>Book Free Inspection</h2>
                <small style={{ color: '#64748b' }}>
                  {year} {make} {model} · Estimated {formatINR(valuation.fairMarketValue)}
                </small>
              </div>
              <button aria-label="Close dialog" onClick={() => setBookingModalOpen(false)}>
                <X size={19} />
              </button>
            </header>

            {bookingSuccess ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  <Check size={28} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '20px', color: '#0f172a' }}>
                  Inspection Request Confirmed!
                </h3>
                <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
                  Our certified evaluation engineer will arrive at your location on <strong>{bookingDate || 'your preferred date'}</strong> at <strong>{bookingTime}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBookingModalOpen(false);
                    setBookingSuccess(false);
                  }}
                  className="button button-dark"
                >
                  Done
                </button>
              </div>
            ) : (
              <form className="management-form" onSubmit={submitInspectionBooking}>
                {bookingError && <p className="management-error" role="alert">{bookingError}</p>}

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155' }}>
                  <strong>Selected Car:</strong> {year} {make} {model} ({fuel}, {km.toLocaleString('en-IN')} km)<br />
                  <strong>Valuation:</strong> {formatINR(valuation.fairMarketValue)} (Instant Cash: {formatINR(valuation.instantCashPrice)})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label className="management-field">
                    Your Name *
                    <input name="name" required placeholder="Full Name" />
                  </label>
                  <label className="management-field">
                    Phone Number *
                    <input name="phone" required type="tel" placeholder="+91 98765 43210" />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label className="management-field">
                    Inspection Date *
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}
                    />
                  </label>
                  <label className="management-field">
                    Time Slot *
                    <select value={bookingTime} onChange={e => setBookingTime(e.target.value)}>
                      <option>10:00 AM</option>
                      <option>11:00 AM</option>
                      <option>02:00 PM</option>
                      <option>04:00 PM</option>
                      <option>06:00 PM</option>
                    </select>
                  </label>
                </div>

                <label className="management-field">
                  Doorstep Address (Home / Office) *
                  <input name="address" required placeholder="House / Flat No, Street, Landmark, City" />
                </label>

                <label className="management-field">
                  Email Address (Optional)
                  <input name="email" type="email" placeholder="you@domain.com" />
                </label>

                <div className="management-form-actions" style={{ marginTop: '12px' }}>
                  <button type="button" className="management-secondary" onClick={() => setBookingModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="management-primary" disabled={bookingSaving}>
                    {bookingSaving ? 'Submitting…' : 'Confirm Free Inspection'} <Check size={16} />
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE VALUATION CERTIFICATE (Shown only on Print)
         ========================================================================= */}
      <div className="val-printable-certificate" style={{ display: 'none' }}>
        <div style={{ border: '2px solid #0f172a', padding: '30px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ff5c00', paddingBottom: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>CARS21 MOBILITY</h1>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Certified Automotive Valuation Certificate</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Issue Date</div>
              <strong>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px' }}>Vehicle Specifications</h3>
              <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Make &amp; Model:</strong> {year} {make} {model}</p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Odometer:</strong> {km.toLocaleString('en-IN')} km</p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Fuel / Transmission:</strong> {fuel} · {transmission}</p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Ownership / Condition:</strong> {owners} Owner · {condition}</p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Registered Location:</strong> {city} {registration ? `(${registration.toUpperCase()})` : ''}</p>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Valuation Summary</h3>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Fair Market Value</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#ff5c00', margin: '4px 0' }}>
                {formatINR(valuation.fairMarketValue)}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                Indicative Range: {formatINR(valuation.marketRange.low)} – {formatINR(valuation.marketRange.high)}
              </div>
              <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
                Instant Cash Payout: <strong>{formatINR(valuation.instantCashPrice)}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8' }}>
            This valuation report is generated algorithmically based on empirical transaction records and regional depreciation schedules. Cars21 Mobility Technologies Pvt. Ltd.
          </div>
        </div>
      </div>
    </>
  );
}
