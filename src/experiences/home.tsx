import { useEffect, useRef, useState, useMemo, type CSSProperties } from 'react';
import { Link, useNavigate } from '../lib/navigation';
import {
  ArrowRight, Check, CarFront, ShieldCheck, FileCheck2, TrendingUp,
  IndianRupee, Heart, BadgeCheck, ChevronDown, CircleHelp, Search,
  ChevronLeft, ChevronRight, Pause, Play, Sparkles, Building2, Sliders,
  Zap, Banknote, Star, Gavel, Cpu, CheckCircle2, Clock, MapPin, Gauge,
  Fuel, Shield, ArrowUpRight, Award, Users, CheckCircle
} from 'lucide-react';
import type { Car } from '../data';
import { formatShort, formatINR } from '../data';
import { CarCard } from '../components/CarCard';
import { SectionTitle, TrustStrip } from '../components/shared';
import { HomeEmiCalculator } from '../components/HomeEmiCalculator';
import { FeaturedCarsSection } from '../components/FeaturedCarsSection';
import { BrandLogo, DEFAULT_BRAND_CATALOG, type BrandCatalogItem } from '../components/BrandLogo';
import { estimateCarValuation } from '../lib/valuation';
import { useBuyerExperience } from '../components/BuyerExperienceProvider';

type HomeFilters = {
  cities: string[];
  makes: string[];
  popularCities?: string[];
  popularMakes?: { make: string; code: string; country?: string; count?: number }[];
  allMakesMeta?: BrandCatalogItem[];
  minPrice: number;
  maxPrice: number;
};

export function HomePage() {
  const { isLeadCaptured, openBuyCarLeadModal } = useBuyerExperience();
  const [hubTab, setHubTab] = useState<'buy' | 'sell'>('buy');
  const [city, setCity] = useState('');
  const [make, setMake] = useState('');
  const [budget, setBudget] = useState('');
  const [query, setQuery] = useState('');
  const [sellInput, setSellInput] = useState('');
  const [sellKm, setSellKm] = useState('30000');

  // Interactive Simulator State
  const [simBody, setSimBody] = useState<'SUV' | 'Sedan' | 'Hatchback' | 'Electric'>('SUV');
  const [simFuel, setSimFuel] = useState<'Petrol' | 'Diesel' | 'CNG' | 'Electric'>('Petrol');
  const [simYear, setSimYear] = useState(2021);
  const [simKm, setSimKm] = useState(32000);
  const [simCondition, setSimCondition] = useState<'Excellent' | 'Good' | 'Fair'>('Excellent');

  // Journey Tab State
  const [journeyTab, setJourneyTab] = useState<'buy' | 'sell' | 'dealer'>('buy');

  // Inventory Filter Tab State
  const [inventoryTab, setInventoryTab] = useState('All');

  const [filters, setFilters] = useState<HomeFilters>({ cities: [], makes: [], minPrice: 0, maxPrice: 0 });
  const [featuredCars, setFeaturedCars] = useState<Car[]>([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    setCarsLoading(true);

    // Fetch filters & live inventory concurrently without failing all if one is slow
    const fetchFilters = fetch('/api/cars/filters', { signal: controller.signal, cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(filterData => {
        if (!filterData || controller.signal.aborted) return;
        setFilters({
          cities: filterData.cities || [],
          makes: filterData.makes || [],
          popularCities: filterData.popularCities || [],
          popularMakes: filterData.popularMakes || [],
          allMakesMeta: filterData.allMakesMeta || [],
          minPrice: filterData.minPrice || 0,
          maxPrice: filterData.maxPrice || 0
        });
        setCity(current => current || filterData.cities?.[0] || '');
      })
      .catch(() => {});

    const fetchCars = fetch('/api/cars?sort=recommended', { signal: controller.signal, cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(carData => {
        if (!carData || controller.signal.aborted) return;
        setFeaturedCars(Array.isArray(carData.cars) ? carData.cars : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setCarsLoading(false);
      });

    Promise.allSettled([fetchFilters, fetchCars]);
    return () => controller.abort();
  }, []);

  const priceBands = filters.maxPrice > 0 ? (() => {
    const low = Math.round((filters.minPrice || 0) / 100000) * 100000;
    const high = filters.maxPrice;
    const first = Math.round((low + (high - low) * 0.45) / 100000) * 100000;
    const second = Math.round((low + (high - low) * 0.75) / 100000) * 100000;
    return [
      { value: '', label: 'Any budget', min: 0, max: 0 },
      { value: 'low', label: `Under ${formatShort(first)}`, min: 0, max: first },
      { value: 'mid', label: `${formatShort(first)} – ${formatShort(second)}`, min: first, max: second },
      { value: 'high', label: `${formatShort(second)}+`, min: second, max: 0 }
    ].filter((band, index, array) => index === 0 || index === array.length - 1 || band.max > band.min);
  })() : [{ value: '', label: 'Any budget', min: 0, max: 0 }];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doSearch = () => {
      const p = new URLSearchParams();
      if (city) p.set('city', city);
      if (query.trim()) p.set('q', query.trim());
      if (make) p.set('make', make);
      const band = priceBands.find(item => item.value === budget);
      if (band?.min) p.set('minPrice', String(band.min));
      if (band?.max) p.set('maxPrice', String(band.max));
      nav(`/buy-cars${p.size ? `?${p}` : ''}`);
    };

    if (!isLeadCaptured) {
      openBuyCarLeadModal(doSearch);
      return;
    }
    doSearch();
  };

  const handleQuickFilter = (q: string, m?: string, b?: string) => {
    const doFilter = () => {
      if (q) setQuery(q);
      if (m) setMake(m);
      if (b) setBudget(b);
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (m) p.set('make', m);
      if (b) {
        const band = priceBands.find(item => item.value === b);
        if (band?.min) p.set('minPrice', String(band.min));
        if (band?.max) p.set('maxPrice', String(band.max));
      }
      nav(`/buy-cars${p.size ? `?${p}` : ''}`);
    };

    if (!isLeadCaptured) {
      openBuyCarLeadModal(doFilter);
      return;
    }
    doFilter();
  };

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nav(`/sell-car?model=${encodeURIComponent(sellInput)}&km=${sellKm}`);
  };

  // Dynamic Valuation Simulator Calculation
  const calculatedValuation = useMemo(() => {
    const val = estimateCarValuation({
      model: simBody,
      year: simYear,
      km: simKm,
      condition: simCondition,
      fuel: simBody === 'Electric' ? 'Electric' : simFuel
    });

    const span = Math.max(1, val.marketRange.high - val.marketRange.low);
    const markerPct = Math.min(88, Math.max(12, Math.round(((val.fairMarketValue - val.marketRange.low) / span) * 100)));

    return {
      low: (val.marketRange.low / 100000).toFixed(2),
      high: (val.marketRange.high / 100000).toFixed(2),
      midFormatted: formatShort(val.fairMarketValue),
      instantCashFormatted: formatShort(val.instantCashPrice),
      confidenceScore: val.confidenceScore,
      demandScore: val.demandIndex,
      markerPct
    };
  }, [simBody, simFuel, simYear, simKm, simCondition]);

  // Filter cars based on selected inventory tab
  const displayedCars = useMemo(() => {
    if (inventoryTab === 'All') return featuredCars.slice(0, 4);
    if (inventoryTab === 'SUVs') return featuredCars.filter(c => c.body === 'SUV').slice(0, 4);
    if (inventoryTab === 'Sedans') return featuredCars.filter(c => c.body === 'Sedan').slice(0, 4);
    if (inventoryTab === 'Electric') return featuredCars.filter(c => c.body === 'Electric').slice(0, 4);
    if (inventoryTab === 'Under 10L') return featuredCars.filter(c => c.price <= 1000000).slice(0, 4);
    return featuredCars.slice(0, 4);
  }, [featuredCars, inventoryTab]);

  return <>
    {/* SIMPLE STREAMLINED HERO SECTION (BUY & SELL ONLY) */}
    <section className="luminous-hero minimal-hero simple-hero">
      <div className="container minimal-hero-container">
        <div className="minimal-hero-header">
          <div className="hero-trust-badge">
            <span className="trust-badge-dot" />
            <span>4.9/5 Rated · Certified Pre-Owned Marketplace</span>
          </div>

          <h1 className="luminous-hero-title">
            The Better Way to <span className="hero-gradient-orange">Buy &amp; Sell Used Cars.</span>
          </h1>

          <p className="luminous-hero-desc">
            Transparent pricing, 140-point inspected vehicles, and instant offers across India.
          </p>
        </div>

        {/* Clean 2-Option Mode Switcher + Search Card */}
        <div className="simple-hero-switch" role="tablist" aria-label="Choose buy or sell">
          <button
            type="button"
            role="tab"
            aria-selected={hubTab === 'buy'}
            className={`simple-hero-switch-btn ${hubTab === 'buy' ? 'active' : ''}`}
            onClick={() => setHubTab('buy')}
          >
            <Search size={15} />
            <span>Buy Cars</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={hubTab === 'sell'}
            className={`simple-hero-switch-btn ${hubTab === 'sell' ? 'active' : ''}`}
            onClick={() => setHubTab('sell')}
          >
            <Zap size={15} />
            <span>Sell Car</span>
            <span className="hub-tab-badge">Instant Cash</span>
          </button>
        </div>

        <div className="luminous-command-card minimal-search-card simple-search-card">
          {hubTab === 'buy' ? (
            <form onSubmit={handleSearchSubmit}>
              <div className="luminous-search-row">
                <div className="luminous-input-group">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Search make, model (e.g. Swift, Ertiga, Creta)..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>

                <div className="luminous-select-group">
                  <MapPin size={15} />
                  <select value={city} onChange={e => setCity(e.target.value)}>
                    <option value="">All Cities</option>
                    {filters.cities.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-chevron" />
                </div>

                <div className="luminous-select-group">
                  <IndianRupee size={15} />
                  <select value={budget} onChange={e => setBudget(e.target.value)}>
                    {priceBands.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-chevron" />
                </div>

                <button type="submit" className="luminous-submit-btn">
                  Search <ArrowRight size={16} />
                </button>
              </div>

              <div className="luminous-quick-tags">
                <span className="tag-label">Popular:</span>
                <span className="luminous-chip" onClick={() => handleQuickFilter('Creta', 'Hyundai')}>Hyundai Creta</span>
                <span className="luminous-chip" onClick={() => handleQuickFilter('Electric')}>EVs &amp; Hybrids</span>
                <span className="luminous-chip" onClick={() => handleQuickFilter('', '', 'low')}>Under ₹10 Lakhs</span>
                <span className="luminous-chip" onClick={() => handleQuickFilter('Swift', 'Maruti Suzuki')}>Maruti Swift</span>
                <span className="luminous-chip" onClick={() => handleQuickFilter('SUV')}>Compact SUVs</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSellSubmit} className="luminous-sell-form">
              <div className="plate-search-box">
                <div className="plate-ind-tag">
                  <div className="plate-ind-circle">●</div>
                  <span>IND</span>
                </div>
                <input
                  type="text"
                  className="plate-input"
                  placeholder="ENTER VEHICLE NUMBER OR MODEL (e.g. KA 01 AB 1234)"
                  value={sellInput}
                  onChange={e => setSellInput(e.target.value)}
                />
                <button type="submit" className="plate-submit-btn">
                  Get Instant Price <ArrowRight size={16} />
                </button>
              </div>

              <div className="luminous-sell-perks">
                <span>⚡ Instant Payout in 30 Mins</span>
                <span>🏠 Free Doorstep Inspection</span>
                <span>📄 100% Free RC Transfer</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
    {/* FEATURED CERTIFIED CAR SHOWCASE (WITH MEMBER LOGIN LOCK & ACTION TRACKING) */}
    <FeaturedCarsSection cars={featuredCars} loading={carsLoading} />

    {/* SMART CAR LOAN EMI CALCULATOR (GATED WITH RECORDED ACTIVITY) */}
    <HomeEmiCalculator />

    {/* ALL CAR BRANDS LOGO GRID */}
    <section className="container brands-showcase-section">
      <div className="brands-strip-title">
        <div>
          <b>Explore All Car Companies</b>
          <small className="brands-strip-sub">Browse verified listings by manufacturer</small>
        </div>
        <Link href="/buy-cars">View all makes <ArrowRight size={13} /></Link>
      </div>
      <div className="brands-showcase-grid">
        {((filters.allMakesMeta && filters.allMakesMeta.length > 0)
          ? filters.allMakesMeta
          : (filters.makes && filters.makes.length > 0)
            ? filters.makes.map((m): BrandCatalogItem => ({ make: m, code: m.slice(0, 2).toUpperCase(), count: 0 }))
            : DEFAULT_BRAND_CATALOG
        ).map(b => (
          <Link key={b.make} href={`/buy-cars?make=${encodeURIComponent(b.make)}`} className="brand-pill-card">
            <span className="brand-logo-stage">
              <BrandLogo make={b.make} code={b.code} />
            </span>
            <b>{b.make}</b>
            <small>{b.count && b.count > 0 ? `${b.count} ${b.count === 1 ? 'car' : 'cars'}` : 'Explore cars'}</small>
          </Link>
        ))}
      </div>
    </section>

    {/* INTERACTIVE REAL-TIME VALUATION SIMULATOR (SAAS WIDGET) */}
    <section className="val-sim-section">
      <div className="val-sim-ambient" aria-hidden="true" />
      <div className="container val-sim-grid">
        <div className="val-sim-copy">
          <span className="val-eyebrow-pill">
            <Sparkles size={13} /> ALGORITHMIC VALUATION ENGINE
          </span>
          <h2>Know exactly what your car is worth today.</h2>
          <p>
            Unlike arbitrary dealership quotes, Cars21 cross-references live wholesale auction bids, regional demand, and condition depreciation in real time.
          </p>

          <div className="val-telemetry-strip">
            <div className="val-telemetry-tile">
              <b>1,200+</b>
              <small>Verified Dealers</small>
            </div>
            <div className="val-telemetry-tile">
              <b>60 sec</b>
              <small>Instant Quote</small>
            </div>
            <div className="val-telemetry-tile">
              <b>4,200+</b>
              <small>Sales Benchmarked</small>
            </div>
          </div>

          <div className="val-inline-bullets">
            <span><CheckCircle2 size={16} /> Backed by live bidding data from certified dealers</span>
            <span><CheckCircle2 size={16} /> 100% free quote with zero obligation to sell</span>
            <span><CheckCircle2 size={16} /> Doorstep check locks in a binding cash offer</span>
          </div>

          <div className="val-sim-actions">
            <Link className="button button-orange val-cta-primary" href="/sell-car">
              Book Free Inspection <ArrowRight size={16} />
            </Link>
            <Link className="val-btn-ghost" href="/sell-car/valuation">
              Advanced Valuation Report <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        {/* INTERACTIVE SIMULATOR CARD */}
        <div className="val-interactive-card">
          <div className="sim-header">
            <span className="sim-header-title">
              <span className="sim-icon-badge"><Cpu size={15} /></span>
              <span>Real-Time Pricing Simulator</span>
            </span>
            <span className="sim-badge">
              <span className="sim-live-dot" /> LIVE ENGINE
            </span>
          </div>

          <div className="sim-controls">
            <div>
              <div className="sim-slider-label">
                <span>Body Style</span>
                <small className="sim-hint">Category</small>
              </div>
              <div className="sim-type-selector">
                {(['SUV', 'Sedan', 'Hatchback', 'Electric'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`sim-type-btn ${simBody === type ? 'active' : ''}`}
                    onClick={() => {
                      setSimBody(type);
                      if (type === 'Electric') setSimFuel('Electric');
                      else if (simFuel === 'Electric') setSimFuel('Petrol');
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="sim-slider-label">
                <span>Fuel Type</span>
                <b>{simBody === 'Electric' ? 'Electric' : simFuel}</b>
              </div>
              <div className="sim-type-selector">
                {(['Petrol', 'Diesel', 'CNG', 'Electric'] as const).map(fuel => {
                  const active = (simBody === 'Electric' ? 'Electric' : simFuel) === fuel;
                  return (
                    <button
                      key={fuel}
                      type="button"
                      className={`sim-type-btn ${active ? 'active' : ''}`}
                      onClick={() => {
                        setSimFuel(fuel);
                        if (fuel === 'Electric') setSimBody('Electric');
                        else if (simBody === 'Electric') setSimBody('SUV');
                      }}
                    >
                      {fuel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sim-slider-row">
              <div className="sim-slider-label">
                <span>Registration Year</span>
                <b className="sim-val-pill">{simYear}</b>
              </div>
              <input
                type="range"
                min={2018}
                max={2025}
                value={simYear}
                onChange={e => setSimYear(Number(e.target.value))}
                className="sim-range"
                style={{ '--slider-pct': `${((simYear - 2018) / (2025 - 2018)) * 100}%` } as CSSProperties}
                aria-label="Registration year"
              />
              <div className="sim-range-extents">
                <small>2018</small>
                <small>2025</small>
              </div>
            </div>

            <div className="sim-slider-row">
              <div className="sim-slider-label">
                <span>Odometer Mileage</span>
                <b className="sim-val-pill">{(simKm / 1000).toFixed(0)},000 km</b>
              </div>
              <input
                type="range"
                min={10000}
                max={90000}
                step={5000}
                value={simKm}
                onChange={e => setSimKm(Number(e.target.value))}
                className="sim-range"
                style={{ '--slider-pct': `${((simKm - 10000) / (90000 - 10000)) * 100}%` } as CSSProperties}
                aria-label="Odometer mileage"
              />
              <div className="sim-range-extents">
                <small>10,000 km</small>
                <small>90,000 km</small>
              </div>
            </div>

            <div className="sim-slider-row">
              <div className="sim-slider-label">
                <span>Overall Condition</span>
                <b>{simCondition}</b>
              </div>
              <div className="sim-type-selector sim-condition-grid">
                {(['Excellent', 'Good', 'Fair'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`sim-type-btn ${simCondition === c ? 'active' : ''}`}
                    onClick={() => setSimCondition(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DYNAMIC RESULT */}
          <div className="sim-output-box">
            <div className="sim-output-top">
              <div className="sim-price-callout">
                <span>ESTIMATED MARKET RANGE</span>
                <b>
                  ₹{calculatedValuation.low} – {calculatedValuation.high} <small>Lakh</small>
                </b>
              </div>
              <div className="sim-mid-badge">
                <small>Instant Cash Offer</small>
                <strong>{calculatedValuation.instantCashFormatted}</strong>
              </div>
            </div>

            {/* Continuous Market Range Spectrum */}
            <div className="sim-spectrum-wrap">
              <div className="sim-spectrum-track">
                <div className="sim-spectrum-fill" />
                <span
                  className="sim-spectrum-pin"
                  style={{ left: `${calculatedValuation.markerPct}%` }}
                  title={`Fair Value: ${calculatedValuation.midFormatted}`}
                />
              </div>
              <div className="sim-spectrum-labels">
                <small>Quick Cash ({calculatedValuation.instantCashFormatted})</small>
                <small className="sim-mid-label">Fair Market ({calculatedValuation.midFormatted})</small>
                <small>Top Retail</small>
              </div>
            </div>

            <div className="sim-meta-row">
              <span>
                <CheckCircle size={13} /> Demand: <b>{calculatedValuation.demandScore}</b>
              </span>
              <span className="sim-confidence-tag">
                {calculatedValuation.confidenceScore}% Model Confidence
              </span>
            </div>
          </div>

          <div className="sim-cta-wrap">
            <Link
              href={`/sell-car?body=${simBody}&fuel=${simBody === 'Electric' ? 'Electric' : simFuel}&year=${simYear}&km=${simKm}`}
              className="button button-primary sim-lock-btn"
            >
              Lock in This Valuation <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* B2B DEALER & ENTERPRISE SAAS ECOSYSTEM */}
    <section className="saas-ecosystem-section">
      <div className="container">
        <div className="saas-section-head">
          <div>
            <span className="saas-eyebrow-pill">
              <Building2 size={12} /> ENTERPRISE AUTOMOTIVE OS
            </span>
            <h2 className="saas-section-title">Built for Dealers, Fleets &amp; Tech-Driven Mobility</h2>
            <p className="saas-section-copy">
              The unified operating system connecting verified sellers, inspected inventory, and wholesale dealer networks across India.
            </p>
          </div>
          <Link href="/dealers" className="button button-outline saas-head-cta">
            Explore Partner Network <ArrowRight size={15} />
          </Link>
        </div>

        <div className="saas-grid">
          {/* Card 1: B2B Dealer Auctions */}
          <div className="saas-card saas-tone-blue">
            <div>
              <div className="saas-card-top">
                <div className="saas-card-icon">
                  <Gavel size={24} />
                </div>
                <span className="saas-pill-badge blue">
                  <span className="saas-pulse-dot" /> LIVE BIDDING
                </span>
              </div>

              <h3>Live B2B Dealer Auctions</h3>
              <p>Dealers bid on pre-inspected vehicles in real time with transparent logs, escrow protection, and automated RC transfer.</p>

              <div className="saas-preview-box">
                <div className="saas-preview-row">
                  <span className="saas-preview-tag">WHOLESALE LOT</span>
                  <b className="saas-preview-status live">Active Floor</b>
                </div>
                <div className="saas-preview-metric">
                  <strong>₹6,45,000</strong>
                  <small>18 live dealer bids · Anti-sniping on</small>
                </div>
              </div>

              <div className="saas-bullets">
                <span className="saas-bullet"><CheckCircle2 size={15} /> Real-time competitive digital bidding</span>
                <span className="saas-bullet"><CheckCircle2 size={15} /> 140-point dossier attached to every lot</span>
                <span className="saas-bullet"><CheckCircle2 size={15} /> Protected escrow &amp; title handover</span>
              </div>
            </div>
            <Link href="/dealer-auctions" className="saas-card-link">
              <span>Explore Dealer Auctions</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {/* Card 2: 140-Point Cloud Diagnostics */}
          <div className="saas-card saas-tone-emerald">
            <div>
              <div className="saas-card-top">
                <div className="saas-card-icon emerald">
                  <Cpu size={24} />
                </div>
                <span className="saas-pill-badge emerald">140 CHECKPOINTS</span>
              </div>

              <h3>140-Point Cloud Diagnostics</h3>
              <p>Standardized technician workflows combining OBD-II telemetry scans, paint-depth gauges, and tamper-proof media.</p>

              <div className="saas-preview-box">
                <div className="saas-preview-row">
                  <span className="saas-preview-tag">DIAGNOSTIC SCORE</span>
                  <b className="saas-preview-status pass">98 / 100 Verified</b>
                </div>
                <div className="saas-preview-bars">
                  <span>Engine &amp; ECU <b>OK</b></span>
                  <span>Chassis Meter <b>Clean</b></span>
                </div>
              </div>

              <div className="saas-bullets">
                <span className="saas-bullet"><CheckCircle2 size={15} /> OBD-II diagnostic fault code scanning</span>
                <span className="saas-bullet"><CheckCircle2 size={15} /> Digital panel thickness verification</span>
                <span className="saas-bullet"><CheckCircle2 size={15} /> Shareable digital inspection reports</span>
              </div>
            </div>
            <Link href="/inspection" className="saas-card-link">
              <span>See Inspection Standard</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {/* Card 3: Dealer Inventory & CRM API */}
          <div className="saas-card saas-tone-purple">
            <div>
              <div className="saas-card-top">
                <div className="saas-card-icon purple">
                  <Building2 size={24} />
                </div>
                <span className="saas-pill-badge purple">DEALER CRM</span>
              </div>

              <h3>Dealer Inventory &amp; CRM Suite</h3>
              <p>Publish certified stock across metros, capture intent-verified buyer leads, and manage showroom inquiries in one portal.</p>

              <div className="saas-preview-box">
                <div className="saas-preview-row">
                  <span className="saas-preview-tag">SHOWROOM PIPELINE</span>
                  <b className="saas-preview-status crm">Pan-India Sync</b>
                </div>
                <div className="saas-preview-bars">
                  <span>Buyer Reveals <b>Instant</b></span>
                  <span>RC Workflow <b>Tracked</b></span>
                </div>
              </div>

              <div className="saas-bullets">
                <span className="saas-bullet"><CheckCircle2 size={15} /> Direct buyer lead &amp; test-drive CRM</span>
                <span className="saas-bullet"><CheckCircle2 size={15} /> Multi-city showroom storefronts</span>
                <span className="saas-bullet"><CheckCircle2 size={15} /> Flexible dealer subscription tiers</span>
              </div>
            </div>
            <Link href="/dealers" className="saas-card-link">
              <span>Browse Dealer Showrooms</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* HOW IT WORKS - 3 STEP CARS24 PROCESS */}
    <section className="section section-soft">
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 32px' }}>
          <span className="eyebrow" style={{ color: '#2563eb' }}>HOW IT WORKS</span>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', margin: '8px 0 12px', color: '#0f172a' }}>
            Transparent Process in 3 Simple Steps
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.65 }}>
            Whether buying or selling, we remove the hassle with digital convenience and verified handovers.
          </p>
        </div>

        <div className="how-it-works-tabs">
          <button
            type="button"
            className={`how-tab-btn ${journeyTab === 'buy' ? 'active' : ''}`}
            onClick={() => setJourneyTab('buy')}
          >
            🚗 How Buying Works
          </button>
          <button
            type="button"
            className={`how-tab-btn ${journeyTab === 'sell' ? 'active' : ''}`}
            onClick={() => setJourneyTab('sell')}
          >
            ⚡ How Selling Works
          </button>
        </div>

        {journeyTab === 'buy' ? (
          <div className="how-steps-grid">
            <div className="how-step-card">
              <span className="how-step-num">01</span>
              <div className="how-step-icon"><Search size={26} /></div>
              <h3>Choose Your Inspected Car</h3>
              <p>Explore 2,400+ certified cars with 140-point inspection reports, high-definition photo galleries, and clear upfront pricing.</p>
              <span className="how-step-bullet"><CheckCircle2 size={16} /> Zero hidden dealership markup</span>
            </div>
            <div className="how-step-card">
              <span className="how-step-num">02</span>
              <div className="how-step-icon"><CarFront size={26} /></div>
              <h3>Test Drive at Home or Hub</h3>
              <p>Experience the drive at your doorstep or visit our fulfillment hub. Instant financing with Loans24 approved in minutes.</p>
              <span className="how-step-bullet"><CheckCircle2 size={16} /> Instant EMI pre-approvals</span>
            </div>
            <div className="how-step-card">
              <span className="how-step-num">03</span>
              <div className="how-step-icon"><ShieldCheck size={26} /></div>
              <h3>Doorstep Delivery &amp; 7-Day Trial</h3>
              <p>Receive keys at your doorstep with paperwork complete. Drive with peace of mind backed by our 7-day money-back guarantee.</p>
              <span className="how-step-bullet"><CheckCircle2 size={16} /> 12-month warranty included</span>
            </div>
          </div>
        ) : (
          <div className="how-steps-grid">
            <div className="how-step-card">
              <span className="how-step-num">01</span>
              <div className="how-step-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><Sliders size={26} /></div>
              <h3>Instant Algorithmic Price</h3>
              <p>Enter your car registration number or model details to get a transparent market estimate backed by live dealer bidding.</p>
              <span className="how-step-bullet"><CheckCircle2 size={16} /> 100% free quote in 60 seconds</span>
            </div>
            <div className="how-step-card">
              <span className="how-step-num">02</span>
              <div className="how-step-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Clock size={26} /></div>
              <h3>Free Doorstep Evaluation</h3>
              <p>Our certified vehicle technician visits your home or office for a 45-minute physical check, locking in your binding cash offer.</p>
              <span className="how-step-bullet"><CheckCircle2 size={16} /> Zero obligation to sell</span>
            </div>
            <div className="how-step-card">
              <span className="how-step-num">03</span>
              <div className="how-step-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Banknote size={26} /></div>
              <h3>Instant Payment &amp; Handover</h3>
              <p>Accept the offer and receive full payment credited instantly to your bank account. We handle the RC transfer 100% free.</p>
              <span className="how-step-bullet"><CheckCircle2 size={16} /> Same-day bank transfer</span>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <Link href={journeyTab === 'buy' ? '/buy-cars' : '/sell-car'} className="button button-orange" style={{ padding: '0 28px' }}>
            {journeyTab === 'buy' ? 'Explore 2,450+ Verified Cars' : 'Get Instant Cash Offer'} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>

    {/* VERIFIED SOCIAL PROOF / REVIEWS */}
    <section className="section container">
      <SectionTitle
        eyebrow="VERIFIED EXPERIENCES"
        title="Trusted by Buyers, Sellers &amp; Dealers"
        copy="Real reviews from drivers who completed their car journey through Cars21."
      />

      <div className="story-grid">
        {[
          {
            quote: "I was hesitant about buying a pre-owned car online, but the 140-point inspection report showed every tiny observation upfront. Delivery was smooth, and the car drives like brand new.",
            name: "Maya Ramesh",
            city: "Bengaluru",
            car: "2022 Honda City ZX",
            role: "Verified Buyer",
            avatar: "MR"
          },
          {
            quote: "Sold my Creta in just 4 hours. The inspector arrived at my home on time, and within 30 minutes of finalizing the price, the full amount was in my account. Best car selling experience by far.",
            name: "Arjun Kapoor",
            city: "Pune",
            car: "2021 Hyundai Creta SX",
            role: "Verified Seller",
            avatar: "AK"
          },
          {
            quote: "As an independent dealer, Cars21 B2B auctions gave me access to high quality, verified vehicles with clean paperwork. It has completely transformed how I source inventory.",
            name: "Vikram Sethi",
            city: "Delhi NCR",
            car: "Apex Motor Hub Partner",
            role: "Verified Dealer",
            avatar: "VS"
          }
        ].map(s => (
          <article className="story-card" key={s.name}>
            <div>
              <div className="story-stars">★★★★★</div>
              <p>“{s.quote}”</p>
            </div>
            <div className="story-author">
              <div className="story-avatar">{s.avatar}</div>
              <div>
                <b>{s.name}</b>
                <small>{s.city} · {s.car}</small>
              </div>
              <span className="verified-buyer-tag">✓ {s.role}</span>
            </div>
          </article>
        ))}
      </div>
    </section>

    {/* FREQUENTLY ASKED QUESTIONS */}
    <section className="section section-soft">
      <div className="container">
        <SectionTitle
          eyebrow="TRANSPARENT ANSWERS"
          title="Frequently Asked Questions"
          copy="Clear answers about vehicle verification, instant selling, and dealer services."
        />
        <div className="faq-grid">
          {[
            [
              'How does Cars21 guarantee vehicle quality?',
              'Every car on Cars21 undergoes our proprietary 140+ point inspection covering engine diagnostics, transmission, suspension, brakes, electricals, and frame integrity. We also verify national police records and RC ownership history.'
            ],
            [
              'How quickly do I get paid when I sell my car?',
              'Once our doorstep technician completes the inspection and you accept the binding offer, the payment is transferred directly to your bank account via instant IMPS/NEFT before the car leaves your custody.'
            ],
            [
              'Can I return the car if I change my mind?',
              'Yes. Verified cars purchased directly through Cars21 come with a 7-day or 500 km money-back guarantee, giving you complete reassurance.'
            ],
            [
              'How can dealers access wholesale auctions?',
              'Certified auto dealerships can join the Cars21 Dealer Partner Network to access our live digital bidding portal, inventory management CRM, and customer inquiry distribution.'
            ]
          ].map(f => (
            <details className="faq-item" key={f[0]}>
              <summary>
                <span>{f[0]}</span>
                <ChevronDown size={17} />
              </summary>
              <p>{f[1]}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  </>;
}





