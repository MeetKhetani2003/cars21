import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from '../lib/navigation';
import { 
  ArrowRight, Check, CarFront, ShieldCheck, FileCheck2, TrendingUp, 
  IndianRupee, Heart, BadgeCheck, ChevronDown, CircleHelp, Search, 
  ChevronLeft, ChevronRight, Pause, Play, Sparkles, Building2, Sliders, 
  Zap, Banknote, Star, Gavel, Cpu, CheckCircle2, Clock, MapPin, Gauge, 
  Fuel, Shield, ArrowUpRight, Award, Users, CheckCircle
} from 'lucide-react';
import type { Car } from '../data';
import { formatShort, formatINR, cars } from '../data';
import { CarCard } from '../components/CarCard';
import { SectionTitle, TrustStrip } from '../components/shared';
import { HomeEmiCalculator } from '../components/HomeEmiCalculator';



type HomeFilters = { cities: string[]; makes: string[]; minPrice: number; maxPrice: number };

export function HomePage() {
  const [hubTab, setHubTab] = useState<'buy' | 'sell' | 'val' | 'dealer'>('buy');
  const [city, setCity] = useState('');
  const [make, setMake] = useState('');
  const [budget, setBudget] = useState('');
  const [query, setQuery] = useState('');
  const [sellInput, setSellInput] = useState('');
  const [sellKm, setSellKm] = useState('30000');
  
  // Interactive Simulator State
  const [simBody, setSimBody] = useState<'SUV' | 'Sedan' | 'Hatchback' | 'Electric'>('SUV');
  const [simYear, setSimYear] = useState(2021);
  const [simKm, setSimKm] = useState(32000);
  const [simCondition, setSimCondition] = useState<'Excellent' | 'Good' | 'Fair'>('Excellent');

  // Journey Tab State
  const [journeyTab, setJourneyTab] = useState<'buy' | 'sell' | 'dealer'>('buy');

  // Inventory Filter Tab State
  const [inventoryTab, setInventoryTab] = useState('All');

  const [filters, setFilters] = useState<HomeFilters>({ cities: [], makes: [], minPrice: 0, maxPrice: 0 });
  const [featuredCars, setFeaturedCars] = useState<Car[]>(cars);
  const nav = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/cars/filters', { signal: controller.signal, cache: 'no-store' }),
      fetch('/api/cars?sort=recommended', { signal: controller.signal, cache: 'no-store' })
    ]).then(async ([filterResponse, carsResponse]) => {
      if (!filterResponse.ok || !carsResponse.ok) throw new Error('Inventory unavailable');
      const filterData = await filterResponse.json();
      const carData = await carsResponse.json();
      if (controller.signal.aborted) return;
      setFilters({
        cities: filterData.cities || [],
        makes: filterData.makes || [],
        minPrice: filterData.minPrice || 0,
        maxPrice: filterData.maxPrice || 0
      });
      setCity(current => current || filterData.cities?.[0] || '');
      setFeaturedCars(carData.cars || []);
    }).catch(() => {});
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
    const p = new URLSearchParams();
    if (city) p.set('city', city);
    if (query.trim()) p.set('q', query.trim());
    if (make) p.set('make', make);
    const band = priceBands.find(item => item.value === budget);
    if (band?.min) p.set('minPrice', String(band.min));
    if (band?.max) p.set('maxPrice', String(band.max));
    nav(`/buy-cars${p.size ? `?${p}` : ''}`);
  };

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nav(`/sell-car?model=${encodeURIComponent(sellInput)}&km=${sellKm}`);
  };

  // Dynamic Valuation Simulator Calculation
  const calculatedValuation = useMemo(() => {
    const basePrices: Record<string, number> = {
      SUV: 1250000,
      Sedan: 1050000,
      Hatchback: 720000,
      Electric: 1450000,
    };
    const base = basePrices[simBody] || 900000;
    const ageDiscount = (2024 - simYear) * 0.085;
    const kmDiscount = Math.max(0, (simKm - 20000) / 100000) * 0.12;
    const condMult = simCondition === 'Excellent' ? 1.06 : simCondition === 'Fair' ? 0.91 : 1.0;
    
    const estMid = Math.max(250000, Math.round((base * (1 - ageDiscount - kmDiscount) * condMult) / 10000) * 10000);
    const estLow = Math.round((estMid * 0.94) / 10000) * 10000;
    const estHigh = Math.round((estMid * 1.06) / 10000) * 10000;

    return {
      low: (estLow / 100000).toFixed(2),
      high: (estHigh / 100000).toFixed(2),
      midFormatted: formatShort(estMid),
      demandScore: simBody === 'SUV' || simBody === 'Electric' ? 'Very High' : 'High'
    };
  }, [simBody, simYear, simKm, simCondition]);

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
    {/* HERO SECTION WITH COMMAND HUB */}
    {/* MODERN LUMINOUS STUDIO HERO SECTION */}
    <section className="luminous-hero">
      <div className="container luminous-hero-grid">
        {/* Left Column: Copy & Command Hub */}
        <div className="luminous-hero-left">
          <div className="hero-trust-badge">
            <span className="trust-badge-dot" />
            <span>⭐ 4.9/5 Rating · 2,450+ Inspected Cars in Bengaluru</span>
          </div>

          <h1 className="luminous-hero-title">
            The Better Way to<br />
            <span className="hero-gradient-orange">Buy &amp; Sell Used Cars.</span>
          </h1>

          <p className="luminous-hero-desc">
            India&apos;s certified auto marketplace. 140+ point cloud diagnostics, 7-day unconditional money-back guarantee, and instant 30-min bank payout.
          </p>

          {/* Integrated Multi-Tab Command Hub Card */}
          <div className="luminous-command-card">
            <div className="luminous-hub-tabs" role="tablist">
              <button 
                type="button" 
                className={`luminous-tab ${hubTab === 'buy' ? 'active' : ''}`}
                onClick={() => setHubTab('buy')}
              >
                <Search size={15} /> Buy Verified Cars
              </button>
              <button 
                type="button" 
                className={`luminous-tab ${hubTab === 'sell' ? 'active' : ''}`}
                onClick={() => setHubTab('sell')}
              >
                <Zap size={15} /> Sell Your Car <span className="hub-tab-badge">Instant Cash</span>
              </button>
              <button 
                type="button" 
                className={`luminous-tab ${hubTab === 'val' ? 'active' : ''}`}
                onClick={() => setHubTab('val')}
              >
                <Sliders size={15} /> AI Valuation
              </button>
            </div>

            {hubTab === 'buy' && (
              <form onSubmit={handleSearchSubmit}>
                <div className="luminous-search-row">
                  <div className="luminous-input-group">
                    <Search size={16} />
                    <input 
                      type="search" 
                      placeholder="Search Honda City, Creta, Nexon EV..." 
                      value={query} 
                      onChange={e => setQuery(e.target.value)} 
                    />
                  </div>

                  <div className="luminous-select-group">
                    <MapPin size={15} />
                    <select value={city} onChange={e => setCity(e.target.value)}>
                      <option value="">All Metros</option>
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
                  <span className="luminous-chip" onClick={() => { setQuery('Creta'); setMake('Hyundai'); }}>Hyundai Creta</span>
                  <span className="luminous-chip" onClick={() => { setQuery('Electric'); }}>EVs &amp; Hybrids</span>
                  <span className="luminous-chip" onClick={() => { setBudget('low'); }}>Under ₹10 Lakhs</span>
                  <span className="luminous-chip" onClick={() => { setQuery('City'); setMake('Honda'); }}>Honda City</span>
                  <span className="luminous-chip" onClick={() => { setQuery('SUV'); }}>Compact SUVs</span>
                </div>
              </form>
            )}

            {hubTab === 'sell' && (
              <form onSubmit={handleSellSubmit} className="luminous-sell-form">
                <div className="plate-search-box">
                  <div className="plate-ind-tag">
                    <div className="plate-ind-circle">●</div>
                    <span>IND</span>
                  </div>
                  <input 
                    type="text" 
                    className="plate-input"
                    placeholder="ENTER VEHICLE NUMBER (e.g. KA 01 AB 1234)" 
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

            {hubTab === 'val' && (
              <div className="luminous-val-panel">
                <div>
                  <b>Calculate instant AI valuation</b>
                  <p>Our valuation engine references real-time dealer auction pricing across 6 metros.</p>
                </div>
                <Link href="/sell-car/valuation" className="luminous-submit-btn">
                  Launch Valuation Engine <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Flagship Studio Vehicle Showcase */}
        <div className="luminous-hero-right">
          <div className="showcase-stage">
            <div className="showcase-glow" />
            <img 
              src="/images/kars21-hero.png" 
              alt="Cars21 Flagship Verified SUV" 
              className="showcase-car-img" 
              fetchPriority="high"
            />
            
            {/* Floating Glassmorphic Badges */}
            <div className="floating-badge badge-top">
              <div className="badge-icon-box green"><ShieldCheck size={18} /></div>
              <div>
                <b>140-Point Passed</b>
                <small>Engine &amp; Chassis 100% Verified</small>
              </div>
            </div>

            <div className="floating-badge badge-bottom-left">
              <div className="badge-icon-box orange"><Zap size={18} /></div>
              <div>
                <b>Instant Cash Offer</b>
                <small>Credited in 30 mins</small>
              </div>
            </div>

            <div className="floating-badge badge-bottom-right">
              <div className="badge-icon-box blue"><Clock size={18} /></div>
              <div>
                <b>7-Day Money Back</b>
                <small>100% Unconditional Refund</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Stats Bar directly at bottom of hero */}
      <div className="container hero-stats-bar">
        <div className="hero-stat-item">
          <b>42,000+</b>
          <span>Happy Car Owners</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat-item">
          <b>140+ Points</b>
          <span>Digital Diagnostics</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat-item">
          <b>30 Minutes</b>
          <span>Fast Bank Payout</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat-item">
          <b>1,200+</b>
          <span>Dealership Partners</span>
        </div>
      </div>
    </section>

    {/* SMART CAR LOAN EMI CALCULATOR (GATED WITH RECORDED ACTIVITY) */}
    <HomeEmiCalculator />

    {/* CARS24 SUPER-APP QUICK SERVICES GRID */}
    <section className="container services-superapp-section">
      <div className="superapp-grid">
        <Link href="/buy-cars" className="superapp-item">
          <div className="superapp-icon-wrap blue"><CarFront size={26} /></div>
          <b>Buy Used Cars</b>
          <small>2,450+ Inspected</small>
        </Link>
        <Link href="/sell-car" className="superapp-item">
          <div className="superapp-icon-wrap orange"><Zap size={26} /></div>
          <b>Sell Your Car</b>
          <small>Instant Cash Offer</small>
        </Link>
        <Link href="/loans24" className="superapp-item">
          <div className="superapp-icon-wrap green"><Banknote size={26} /></div>
          <b>Car Loans &amp; EMI</b>
          <small>From 8.75% Interest</small>
        </Link>
        <Link href="/sell-car/valuation" className="superapp-item">
          <div className="superapp-icon-wrap amber"><Sliders size={26} /></div>
          <b>Valuation Engine</b>
          <small>Live Market Price</small>
        </Link>
        <Link href="/inspection" className="superapp-item">
          <div className="superapp-icon-wrap indigo"><ShieldCheck size={26} /></div>
          <b>140-Point Check</b>
          <small>Digital Health Report</small>
        </Link>
        <Link href="/dealer-auctions" className="superapp-item">
          <div className="superapp-icon-wrap purple"><Gavel size={26} /></div>
          <b>Dealer Auctions</b>
          <small>Live Wholesale Bidding</small>
        </Link>
      </div>
    </section>

    {/* POPULAR BRANDS SHOWCASE STRIP */}
    <section className="container brands-showcase-section">
      <div className="brands-strip-title">
        <b>Popular Brands in Demand</b>
        <Link href="/buy-cars">View all makes <ArrowRight size={13} /></Link>
      </div>
      <div className="brands-showcase-grid">
        {[
          { make: 'Maruti Suzuki', code: 'MS', count: '320+ cars' },
          { make: 'Hyundai', code: 'HY', count: '240+ cars' },
          { make: 'Tata', code: 'TA', count: '190+ cars' },
          { make: 'Mahindra', code: 'MH', count: '130+ cars' },
          { make: 'Honda', code: 'HO', count: '115+ cars' },
          { make: 'Toyota', code: 'TY', count: '95+ cars' },
          { make: 'Kia', code: 'KA', count: '85+ cars' },
          { make: 'Volkswagen', code: 'VW', count: '60+ cars' },
        ].map(b => (
          <Link key={b.make} href={`/buy-cars?make=${encodeURIComponent(b.make)}`} className="brand-pill-card">
            <span className="brand-initial-icon">{b.code}</span>
            <b>{b.make}</b>
            <small>{b.count}</small>
          </Link>
        ))}
      </div>
    </section>

    {/* THE CARS21 ASSURANCE BENTO GRID */}
    <section className="container" style={{ margin: '48px auto' }}>
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 28px' }}>
        <span className="eyebrow" style={{ color: '#2563eb' }}>THE CARS21 STANDARD</span>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.035em', margin: '8px 0 12px', color: '#0f172a' }}>
          Zero Guesswork. 100% Peace of Mind.
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.65 }}>
          India&apos;s most rigorous automotive inspection standard, instant guaranteed payouts, and unconditional return policies.
        </p>
      </div>

      <div className="bento-assurance-grid">
        {/* Bento 1: Large 140+ Point Inspection */}
        <div className="bento-card bento-card-large">
          <div>
            <span className="bento-badge-pill"><ShieldCheck size={14} /> CERTIFIED STANDARD</span>
            <h3>140+ Point Cloud Diagnostics</h3>
            <p>Every vehicle undergoes multi-stage hardware and OBD-II cloud diagnostic analysis by certified vehicle engineers before being listed.</p>
            
            <div className="bento-checklist">
              <div className="bento-check-row">
                <span><CheckCircle2 size={16} /> Engine &amp; Transmission Drivetrain</span>
                <span className="bento-check-score">99% Passed</span>
              </div>
              <div className="bento-check-row">
                <span><CheckCircle2 size={16} /> OBD-II ECU Sensor &amp; Wiring Scan</span>
                <span className="bento-check-score">0 Errors</span>
              </div>
              <div className="bento-check-row">
                <span><CheckCircle2 size={16} /> Suspension, Steering &amp; Brakes</span>
                <span className="bento-check-score">98% Verified</span>
              </div>
              <div className="bento-check-row">
                <span><CheckCircle2 size={16} /> Digital Paint Thickness Meter (Accident Shield)</span>
                <span className="bento-check-score">Non-Accidental</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <Link href="/inspection" className="button button-dark button-small">
              View Inspection Checklist <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Bento 2: 7-Day Money Back */}
        <div className="bento-card">
          <div className="bento-icon-box orange">
            <Clock size={24} />
          </div>
          <h3>7-Day Money Back</h3>
          <p>Drive your car for up to 7 days or 500 km. If it doesn&apos;t fit your lifestyle, return it for a 100% full refund with zero questions.</p>
          <span className="bento-micro-stat"><Award size={14} /> 100% Money-Back Pledge</span>
        </div>

        {/* Bento 3: Instant 30-Min Bank Payout */}
        <div className="bento-card">
          <div className="bento-icon-box blue">
            <Banknote size={24} />
          </div>
          <h3>Instant Payout in 30 Min</h3>
          <p>Direct bank IMPS/NEFT transfer executed on the spot before handing over car keys. No waiting or follow-ups.</p>
          <span className="bento-micro-stat"><Zap size={14} /> Instant Bank Credit</span>
        </div>

        {/* Bento 4: Free RC Transfer */}
        <div className="bento-card">
          <div className="bento-icon-box emerald">
            <FileCheck2 size={24} />
          </div>
          <h3>100% Free RC Transfer</h3>
          <p>We handle complete RTO documentation, transfer fees, and deliver the transferred registration certificate to your doorstep.</p>
          <span className="bento-micro-stat"><CheckCircle size={14} /> Tracked in Dashboard</span>
        </div>

        {/* Bento 5: 12-Month Comprehensive Warranty */}
        <div className="bento-card">
          <div className="bento-icon-box indigo">
            <Shield size={24} />
          </div>
          <h3>12-Month Warranty</h3>
          <p>Major mechanical and electrical systems covered with pan-India cashless roadside assistance and certified workshops.</p>
          <span className="bento-micro-stat"><ShieldCheck size={14} /> Free Roadside Assist</span>
        </div>
      </div>
    </section>

    {/* INTENT SPLIT GATEWAY (BUYER VS SELLER) */}
    <section className="section container">
      <SectionTitle 
        eyebrow="YOUR CAR DESTINATION" 
        title="Engineered for Buyers, Sellers &amp; Dealers" 
        copy="Two transparent pathways backed by digital verification and guaranteed transactions."
      />
      <div className="intent-grid">
        <Link href="/buy-cars" className="intent-card">
          <div>
            <span className="intent-badge">The Buyer Hub</span>
            <h3>Find &amp; Own With 100% Peace of Mind</h3>
            <p>Every vehicle on Cars21 is verified with high-resolution inspection reports, documented history, and clear upfront pricing.</p>
            <div className="intent-points">
              <span className="intent-point"><CheckCircle2 /> 140-point full digital inspection report</span>
              <span className="intent-point"><CheckCircle2 /> 7-day money-back guarantee &amp; warranty</span>
              <span className="intent-point"><CheckCircle2 /> Instant digital loan approval with Loans24</span>
            </div>
          </div>
          <span className="intent-action">Browse Verified Cars <ArrowRight size={16} /></span>
        </Link>

        <Link href="/sell-car" className="intent-card seller">
          <div>
            <span className="intent-badge seller-badge">The Seller Gateway</span>
            <h3>Sell Fast at the Market's Best Price</h3>
            <p>Get a transparent valuation backed by live dealer bidding. Free doorstep inspection and instant payment upon agreement.</p>
            <div className="intent-points">
              <span className="intent-point"><CheckCircle2 /> Indicative estimate in under 60 seconds</span>
              <span className="intent-point"><CheckCircle2 /> Free doorstep technician visit &amp; test</span>
              <span className="intent-point"><CheckCircle2 /> Same-day payment &amp; hassle-free RC transfer</span>
            </div>
          </div>
          <span className="intent-action">Get Car Price <ArrowRight size={16} /></span>
        </Link>
      </div>
    </section>

    {/* BROWSE BY BODY TYPE WITH MODERN CARDS */}
    <section className="section section-soft">
      <div className="container">
        <SectionTitle 
          eyebrow="EXPLORE CATEGORIES" 
          title="Browse by Body Style &amp; Purpose" 
          copy="Tailored for family adventures, city commuting, or executive road trips."
          link="/buy-cars" 
          linkText="View all listings"
        />
        <div className="category-grid">
          {[
            { name: 'SUVs & Crossovers', body: 'SUV', count: '142 cars', caption: 'High clearance & spacious cabin', letter: 'SUV' },
            { name: 'Executive Sedans', body: 'Sedan', count: '96 cars', caption: 'Smooth highway comfort', letter: 'SED' },
            { name: 'City Hatchbacks', body: 'Hatchback', count: '118 cars', caption: 'Compact & fuel efficient', letter: 'HAT' },
            { name: 'Electric & Hybrid', body: 'Electric', count: '38 cars', caption: 'Zero emissions, smart tech', letter: 'EV' },
            { name: 'Automatic Drive', body: 'Automatic', count: '210 cars', caption: 'Effortless stop-and-go driving', letter: 'AT' },
            { name: 'Luxury & Premium', body: 'Luxury', count: '45 cars', caption: 'Top tier refinement & status', letter: 'LUX' }
          ].map((c) => (
            <Link href={`/buy-cars?body=${c.body}`} className="modern-category-card" key={c.name}>
              <div className="category-top">
                <span className="category-icon-box">{c.letter}</span>
                <span className="category-count-badge">{c.count}</span>
              </div>
              <div className="category-body">
                <b>{c.name}</b>
                <p>{c.caption}</p>
              </div>
              <div className="category-footer-arrow">
                <ArrowRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* FEATURED INVENTORY SHOWCASE WITH TABS */}
    <section className="section container">
      <SectionTitle 
        eyebrow="CURRENT INVENTORY" 
        title="Handpicked, Certified Vehicles" 
        copy="Each vehicle has passed a 140+ point check with documented service records."
        link="/buy-cars" 
        linkText="See all 2,450+ cars"
      />

      <div className="inventory-tabs-row">
        <div className="inventory-filter-pills">
          {['All', 'SUVs', 'Sedans', 'Electric', 'Under 10L'].map(tab => (
            <button 
              key={tab} 
              type="button" 
              className={`filter-pill ${inventoryTab === tab ? 'active' : ''}`}
              onClick={() => setInventoryTab(tab)}
            >
              {tab === 'All' ? 'All Featured' : tab}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Showing verified listings available for immediate delivery
        </span>
      </div>

      {displayedCars.length ? (
        <div className="car-grid">
          {displayedCars.map(car => <CarCard car={car} key={car.id} />)}
        </div>
      ) : (
        <div className="home-inventory-empty">
          <CarFront size={28} />
          <div>
            <b>No cars match this filter right now</b>
            <span>Check back soon or explore dealer listings.</span>
          </div>
          <Link href="/dealers" className="text-link">Browse Dealer Hub <ArrowRight size={15} /></Link>
        </div>
      )}
    </section>

    {/* INTERACTIVE REAL-TIME VALUATION SIMULATOR (SAAS WIDGET) */}
    <section className="val-sim-section">
      <div className="container val-sim-grid">
        <div className="val-sim-copy">
          <span className="eyebrow"><Sparkles size={13} style={{ color: '#2563eb' }} /> ALGORITHMIC VALUATION ENGINE</span>
          <h2>Know exactly what your car is worth today.</h2>
          <p>
            Unlike traditional dealership estimates, Cars21 analyzes historical auction bidding data, current regional demand, and condition-based degradation to generate a fair market valuation in real time.
          </p>

          <div className="inline-bullets">
            <span><Check /> Backed by live bidding data from 1,200+ verified dealers</span>
            <span><Check /> 100% free, no obligation to sell</span>
            <span><Check /> Inspection locks in guaranteed offer</span>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', gap: '14px' }}>
            <Link className="button button-dark" href="/sell-car">
              Book Free Inspection <ArrowRight size={16} />
            </Link>
            <Link className="button button-outline" href="/sell-car/valuation">
              Advanced Valuation Report
            </Link>
          </div>
        </div>

        {/* INTERACTIVE SIMULATOR CARD */}
        <div className="val-interactive-card">
          <div className="sim-header">
            <span className="sim-header-title">
              <Cpu size={16} /> Real-Time Pricing Simulator
            </span>
            <span className="sim-badge">LIVE DEMO</span>
          </div>

          <div className="sim-controls">
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                VEHICLE BODY TYPE
              </span>
              <div className="sim-type-selector">
                {(['SUV', 'Sedan', 'Hatchback', 'Electric'] as const).map(type => (
                  <button 
                    key={type} 
                    type="button" 
                    className={`sim-type-btn ${simBody === type ? 'active' : ''}`}
                    onClick={() => setSimBody(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="sim-slider-row">
              <div className="sim-slider-label">
                <span>Registration Year</span>
                <b>{simYear}</b>
              </div>
              <input 
                type="range" 
                min={2018} 
                max={2024} 
                value={simYear} 
                onChange={e => setSimYear(Number(e.target.value))} 
                className="sim-range" 
              />
            </div>

            <div className="sim-slider-row">
              <div className="sim-slider-label">
                <span>Odometer Mileage</span>
                <b>{(simKm / 1000).toFixed(0)}k km</b>
              </div>
              <input 
                type="range" 
                min={10000} 
                max={90000} 
                step={5000} 
                value={simKm} 
                onChange={e => setSimKm(Number(e.target.value))} 
                className="sim-range" 
              />
            </div>

            <div className="sim-slider-row">
              <div className="sim-slider-label">
                <span>Vehicle Condition</span>
                <b>{simCondition}</b>
              </div>
              <div className="sim-type-selector" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
            <div className="sim-price-callout">
              <span>Estimated Valuation</span>
              <b>₹ {calculatedValuation.low} – {calculatedValuation.high} <small>Lakh</small></b>
            </div>

            <div className="sim-bars">
              {Array.from({ length: 18 }, (_, i) => {
                const heightPercent = 25 + (i * 4) + ((simYear - 2018) * 4) - ((simKm / 90000) * 15);
                const isHighlight = i >= 11 && i <= 15;
                return (
                  <div 
                    key={i} 
                    className={`sim-bar ${isHighlight ? 'highlight' : ''}`}
                    style={{ height: `${Math.min(100, Math.max(15, heightPercent))}%` }} 
                  />
                );
              })}
            </div>

            <div className="sim-meta-row">
              <span><CheckCircle size={14} /> Market Demand: <b>{calculatedValuation.demandScore}</b></span>
              <span>Based on 4,200+ transactions</span>
            </div>
          </div>

          <div className="sim-cta-wrap">
            <Link href={`/sell-car?body=${simBody}&year=${simYear}&km=${simKm}`} className="button button-primary">
              Lock in This Valuation <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* B2B DEALER & ENTERPRISE SAAS ECOSYSTEM */}
    <section className="section container">
      <SectionTitle 
        eyebrow="ENTERPRISE AUTOMOTIVE SAAS" 
        title="Built for Dealers, Fleets &amp; Tech-Driven Mobility" 
        copy="Cars21 provides the operating system connecting verified sellers, certified dealerships, and retail buyers."
      />

      <div className="saas-grid">
        <div className="saas-card">
          <div>
            <div className="saas-card-icon">
              <Gavel size={26} />
            </div>
            <h3>Live B2B Dealer Auctions</h3>
            <p>Dealers bid on verified vehicles in real time. Transparent auction logs with guaranteed vehicle delivery and clear title transfer.</p>
            <div className="saas-bullets">
              <span className="saas-bullet"><Check /> Real-time competitive digital bidding</span>
              <span className="saas-bullet"><Check /> Certified inspection documentation</span>
              <span className="saas-bullet"><Check /> Instant escrow settlement</span>
            </div>
          </div>
          <Link href="/dealer-auctions" className="saas-card-link">
            Explore Dealer Auctions <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="saas-card">
          <div>
            <div className="saas-card-icon emerald">
              <Cpu size={26} />
            </div>
            <h3>140-Point Cloud Diagnostics</h3>
            <p>Proprietary inspection app and checklists standardized across 200+ certified vehicle inspectors nationwide.</p>
            <div className="saas-bullets">
              <span className="saas-bullet"><Check /> OBD-II diagnostic code scanning</span>
              <span className="saas-bullet"><Check /> High-resolution exterior paint meters</span>
              <span className="saas-bullet"><Check /> Instant downloadable PDF reports</span>
            </div>
          </div>
          <Link href="/inspection" className="saas-card-link">
            See Inspection Standard <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="saas-card">
          <div>
            <div className="saas-card-icon purple">
              <Building2 size={26} />
            </div>
            <h3>Dealer Inventory &amp; CRM API</h3>
            <p>Sync inventory, track buyer leads, reveal verified customer contacts, and run multi-city dealer showrooms.</p>
            <div className="saas-bullets">
              <span className="saas-bullet"><Check /> Instant customer phone reveal CRM</span>
              <span className="saas-bullet"><Check /> Multi-channel inventory syndication</span>
              <span className="saas-bullet"><Check /> Tiered dealer subscription plans</span>
            </div>
          </div>
          <Link href="/dealers" className="saas-card-link">
            Browse Dealer Showrooms <ArrowUpRight size={14} />
          </Link>
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

    {/* FINANCING & LOANS24 BANNER */}
    <section className="section container">
      <div className="finance-banner">
        <div className="finance-art">
          <div className="finance-orbit orbit-a" />
          <div className="finance-orbit orbit-b" />
          <div className="finance-card-visual">
            <span>LOANS<span>24</span></span>
            <small>SMART AUTOMOTIVE FINANCING</small>
            <b>EMI that fits your budget.</b>
            <div className="mini-chart">
              {Array.from({ length: 12 }, (_, i) => <i key={i} />)}
            </div>
          </div>
        </div>

        <div className="finance-copy">
          <span className="eyebrow">LOANS24 DIGITAL LENDING</span>
          <h2>Instant pre-approvals with 9+ partner banks.</h2>
          <p>
            Financing your next car shouldn't mean endless paperwork. Enjoy transparent interest rates starting at 8.75% and loan tenures up to 84 months with fast digital verification.
          </p>
          <div className="finance-actions">
            <Link className="button button-light" href="/loans24/emi-calculator">
              Calculate Your EMI <ArrowRight size={16} />
            </Link>
            <Link className="text-link text-link-light" href="/loans24">
              Check Eligibility <ArrowUpRight size={14} />
            </Link>
          </div>
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

    {/* CLOSING HIGH-IMPACT PLATFORM CTA */}
    <section className="container platform-cta-wrap">
      <div className="platform-cta-banner">
        <div className="platform-cta-copy">
          <span className="eyebrow" style={{ color: '#38bdf8' }}>READY TO GET STARTED?</span>
          <h2>The modern way to buy, sell &amp; finance cars.</h2>
          <p>
            Join over 18,000 satisfied car owners and 1,200+ certified dealership partners across India.
          </p>
          <div className="platform-cta-btns">
            <Link className="button button-primary" href="/buy-cars">
              Explore 2,450+ Verified Cars <ArrowRight size={17} />
            </Link>
            <Link className="button button-outline-light" href="/sell-car">
              Sell Your Car Today <Zap size={16} />
            </Link>
          </div>
        </div>

        <div className="platform-cta-perks">
          <div className="cta-perk-item">
            <div className="cta-perk-icon"><ShieldCheck size={18} /></div>
            <div>
              <b>140-Point AI Diagnostics</b>
              <small>Standardized digital inspection reports</small>
            </div>
          </div>
          <div className="cta-perk-item">
            <div className="cta-perk-icon"><Banknote size={18} /></div>
            <div>
              <b>Instant Bank Payout</b>
              <small>Funds transferred within 30 minutes</small>
            </div>
          </div>
          <div className="cta-perk-item">
            <div className="cta-perk-icon"><Building2 size={18} /></div>
            <div>
              <b>1,200+ Verified Dealers</b>
              <small>Nationwide wholesale auction network</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  </>;
}





