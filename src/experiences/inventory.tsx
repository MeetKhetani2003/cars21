import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from '../lib/navigation';
import { Search, Filter, SlidersHorizontal, X, ChevronRight, ShieldCheck, Sparkles, Fuel, Settings2, CarFront, IndianRupee, RotateCcw } from 'lucide-react';
import type { Car } from '../data';
import { formatShort } from '../data';
import { CarCard } from '../components/CarCard';

type InventoryResponse = { cars: Car[]; count: number; source: 'mongodb' | 'demo'; error?: string };
type FilterOptions = { cities: string[]; makes: string[]; models: string[]; fuels: string[]; bodyTypes: string[]; transmissions: string[]; minPrice: number; maxPrice: number; source: string };
const emptyOptions: FilterOptions = { cities: [], makes: [], models: [], fuels: [], bodyTypes: [], transmissions: [], minPrice: 0, maxPrice: 0, source: '' };

const POPULAR_MAKES = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Honda', 'Mahindra', 'Toyota', 'Kia', 'BMW'];
const BUDGET_PRESETS = [
  { label: 'Under ₹5 Lakh', min: 0, max: 500000 },
  { label: '₹5L - ₹10 Lakh', min: 500000, max: 1000000 },
  { label: '₹10L - ₹15 Lakh', min: 1000000, max: 1500000 },
  { label: 'Above ₹15 Lakh', min: 1500000, max: 0 },
];
const BODY_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Luxury'];

export function InventoryPage() {
  const { city: routeCity } = useParams<{ city?: string }>();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [make, setMake] = useState(params.get('make') || '');
  const [model, setModel] = useState(params.get('model') || '');
  const [city, setCity] = useState(params.get('city') || routeCity || '');
  const [fuel, setFuel] = useState(params.get('fuel') || '');
  const [body, setBody] = useState(params.get('body') || '');
  const [transmission, setTransmission] = useState(params.get('transmission') || '');
  const [minPrice, setMinPrice] = useState(Number(params.get('minPrice') || 0));
  const [maxPrice, setMaxPrice] = useState(Number(params.get('maxPrice') || 0));
  const [sort, setSort] = useState(params.get('sort') || 'recommended');
  const [options, setOptions] = useState(emptyOptions);
  const [mobileFilter, setMobileFilter] = useState(false);
  const [result, setResult] = useState<Car[]>([]);
  const [source, setSource] = useState<'mongodb' | 'demo' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/cars/filters', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Could not load available filters.'); return response.json() as Promise<FilterOptions>; })
      .then(next => { if (controller.signal.aborted) return; setOptions(next); if (!city && routeCity) setCity(routeCity); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load filters.'); });
    return () => controller.abort();
  }, [routeCity]);

  useEffect(() => {
    if (model && options.models.length && !options.models.includes(model)) setModel('');
  }, [model, options.models]);

  const filterKey = useMemo(() => JSON.stringify({ query, make, model, city, fuel, body, transmission, minPrice, maxPrice, sort }), [query, make, model, city, fuel, body, transmission, minPrice, maxPrice, sort]);
  useEffect(() => {
    const filters = JSON.parse(filterKey) as { query: string; make: string; model: string; city: string; fuel: string; body: string; transmission: string; minPrice: number; maxPrice: number; sort: string };
    const search = new URLSearchParams();
    if (filters.query.trim()) search.set('q', filters.query.trim());
    if (filters.make) search.set('make', filters.make);
    if (filters.model) search.set('model', filters.model);
    if (filters.city) search.set('city', filters.city);
    if (filters.fuel) search.set('fuel', filters.fuel);
    if (filters.body) search.set('body', filters.body);
    if (filters.transmission) search.set('transmission', filters.transmission);
    if (filters.minPrice > 0) search.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice > 0) search.set('maxPrice', String(filters.maxPrice));
    if (filters.sort !== 'recommended') search.set('sort', filters.sort);
    setParams(search);
    if (search.size) {
      const label = [filters.query.trim(), filters.city, filters.make, filters.model, filters.fuel, filters.body, filters.transmission, filters.minPrice ? `from ${formatShort(filters.minPrice)}` : '', filters.maxPrice ? `up to ${formatShort(filters.maxPrice)}` : ''].filter(Boolean).join(' · ');
      void fetch('/api/user/actions', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'search', targetType: 'search', label }) }).catch(() => null);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const response = await fetch(`/api/cars?${search.toString()}`, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
        const payload = await response.json() as InventoryResponse;
        if (!response.ok) throw new Error(payload.error || 'Could not load inventory.');
        setResult(payload.cars); setSource(payload.source);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load inventory.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filterKey, retry, setParams]);

  const clear = () => { setQuery(''); setMake(''); setModel(''); setCity(''); setFuel(''); setBody(''); setTransmission(''); setMinPrice(0); setMaxPrice(0); setSort('recommended'); };
  const sliderMax = Math.max(options.maxPrice, 1);
  const sliderValue = Math.min(maxPrice || sliderMax, sliderMax);
  const minSliderValue = minPrice || options.minPrice;
  const maxSliderMinimum = Math.min(minSliderValue, options.maxPrice || minSliderValue);

  const applyBudgetPreset = (min: number, max: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  const filtersContent = (
    <div className="filter-panel-inner">
      <div className="filter-group">
        <label className="filter-group-title">
          <span>City / Location</span>
          {city && <button type="button" className="filter-reset-mini" onClick={() => setCity('')}>Clear</button>}
        </label>
        <div className="filter-select-wrap">
          <select value={city} onChange={event => setCity(event.target.value)} className="filter-styled-select">
            <option value="">All Indian Cities</option>
            {options.cities.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-group-title">
          <span>Brand / Make</span>
          {make && <button type="button" className="filter-reset-mini" onClick={() => { setMake(''); setModel(''); }}>Clear</button>}
        </label>
        <div className="filter-select-wrap">
          <select value={make} onChange={event => { setMake(event.target.value); setModel(''); }} className="filter-styled-select">
            <option value="">All Brands</option>
            {options.makes.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="filter-quick-chips">
          {POPULAR_MAKES.slice(0, 6).map(b => (
            <button 
              key={b} 
              type="button" 
              className={`chip-toggle ${make.toLowerCase() === b.toLowerCase() ? 'active' : ''}`}
              onClick={() => {
                if (make.toLowerCase() === b.toLowerCase()) { setMake(''); setModel(''); }
                else { setMake(b); setModel(''); }
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {make && (
        <div className="filter-group">
          <label className="filter-group-title">
            <span>Model ({make})</span>
            {model && <button type="button" className="filter-reset-mini" onClick={() => setModel('')}>Clear</button>}
          </label>
          <div className="filter-select-wrap">
            <select value={model} onChange={event => setModel(event.target.value)} className="filter-styled-select">
              <option value="">All Models</option>
              {options.models.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="filter-group">
        <label className="filter-group-title">
          <span>Budget Range</span>
          {(minPrice > 0 || maxPrice > 0) && (
            <button type="button" className="filter-reset-mini" onClick={() => { setMinPrice(0); setMaxPrice(0); }}>Clear</button>
          )}
        </label>
        <div className="budget-presets-grid">
          {BUDGET_PRESETS.map((preset, idx) => {
            const isActive = minPrice === preset.min && maxPrice === preset.max;
            return (
              <button
                key={idx}
                type="button"
                className={`budget-preset-btn ${isActive ? 'active' : ''}`}
                onClick={() => applyBudgetPreset(preset.min, preset.max)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="filter-sliders-wrap">
          <div className="range-bubble-row">
            <span>Min: <b>{minPrice ? formatShort(minPrice) : 'Any'}</b></span>
            <span>Max: <b>{maxPrice ? formatShort(maxPrice) : `${formatShort(sliderMax)}+`}</b></span>
          </div>
          <input 
            type="range" 
            min={options.minPrice} 
            max={sliderMax} 
            step={Math.max(10000, Math.round((sliderMax - options.minPrice) / 100))} 
            value={minSliderValue} 
            disabled={options.maxPrice <= options.minPrice} 
            aria-label="Set minimum car price" 
            onChange={event => { 
              const value = Number(event.target.value); 
              setMinPrice(value <= options.minPrice ? 0 : value); 
              if (maxPrice && value >= maxPrice) setMaxPrice(0); 
            }}
            className="filter-slider"
          />
          <input 
            type="range" 
            min={maxSliderMinimum} 
            max={sliderMax} 
            step={Math.max(10000, Math.round((sliderMax - options.minPrice) / 100))} 
            value={Math.max(maxSliderMinimum, sliderValue)} 
            disabled={options.maxPrice <= options.minPrice} 
            aria-label="Set maximum car price" 
            onChange={event => { 
              const value = Number(event.target.value); 
              setMaxPrice(value >= options.maxPrice ? 0 : value); 
            }}
            className="filter-slider"
          />
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-group-title">
          <span>Fuel Type</span>
          {fuel && <button type="button" className="filter-reset-mini" onClick={() => setFuel('')}>Clear</button>}
        </label>
        <div className="filter-chips-grid">
          {['Petrol', 'Diesel', 'CNG', 'Electric'].map(f => (
            <button
              key={f}
              type="button"
              className={`chip-toggle ${fuel.toLowerCase() === f.toLowerCase() ? 'active' : ''}`}
              onClick={() => setFuel(fuel.toLowerCase() === f.toLowerCase() ? '' : f)}
            >
              <Fuel size={12} /> {f}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-group-title">
          <span>Transmission</span>
          {transmission && <button type="button" className="filter-reset-mini" onClick={() => setTransmission('')}>Clear</button>}
        </label>
        <div className="filter-chips-grid">
          {['Manual', 'Automatic'].map(t => (
            <button
              key={t}
              type="button"
              className={`chip-toggle ${transmission.toLowerCase() === t.toLowerCase() ? 'active' : ''}`}
              onClick={() => setTransmission(transmission.toLowerCase() === t.toLowerCase() ? '' : t)}
            >
              <Settings2 size={12} /> {t}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-group-title">
          <span>Body Type</span>
          {body && <button type="button" className="filter-reset-mini" onClick={() => setBody('')}>Clear</button>}
        </label>
        <div className="filter-chips-grid">
          {BODY_TYPES.map(b => (
            <button
              key={b}
              type="button"
              className={`chip-toggle ${body.toLowerCase() === b.toLowerCase() ? 'active' : ''}`}
              onClick={() => setBody(body.toLowerCase() === b.toLowerCase() ? '' : b)}
            >
              <CarFront size={12} /> {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const chips = [
    ...(query ? [{ label: `"${query}"`, clear: () => setQuery('') }] : []),
    ...(city ? [{ label: `City: ${city}`, clear: () => setCity('') }] : []),
    ...(make ? [{ label: `Brand: ${make}`, clear: () => { setMake(''); setModel(''); } }] : []),
    ...(model ? [{ label: `Model: ${model}`, clear: () => setModel('') }] : []),
    ...(fuel ? [{ label: fuel, clear: () => setFuel('') }] : []),
    ...(body ? [{ label: body, clear: () => setBody('') }] : []),
    ...(transmission ? [{ label: transmission, clear: () => setTransmission('') }] : []),
    ...(minPrice ? [{ label: `From ${formatShort(minPrice)}`, clear: () => setMinPrice(0) }] : []),
    ...(maxPrice ? [{ label: `Up to ${formatShort(maxPrice)}`, clear: () => setMaxPrice(0) }] : []),
  ];

  return (
    <div className="inventory-experience-page">
      {/* Luxury Marketplace Header Strip */}
      <section className="marketplace-header-strip">
        <div className="container">
          <div className="market-header-breadcrumbs">
            <Link href="/" className="market-crumb-link">Home</Link>
            <ChevronRight size={13} />
            <span>Buy Used Cars</span>
            {city && (
              <>
                <ChevronRight size={13} />
                <span className="current-crumb">{city}</span>
              </>
            )}
          </div>
          <div className="market-header-content">
            <div>
              <span className="market-badge-pill">
                <ShieldCheck size={14} /> 100% Verified Quality Fleet
              </span>
              <h1 className="market-header-title">
                {city ? `Verified Used Cars in ${city}` : 'Find Your Certified Pre-Owned Car'}
              </h1>
              <p className="market-header-sub">
                Every vehicle includes a 140-point digital inspection, 7-day money-back guarantee, and 1-year comprehensive warranty.
              </p>
            </div>
            <div className="market-quick-stats">
              <div className="stat-pill">
                <b>{result.length}</b>
                <span>Cars Available</span>
              </div>
              <div className="stat-pill">
                <b>140+</b>
                <span>Points Checked</span>
              </div>
              <div className="stat-pill highlight">
                <b>7-Day</b>
                <span>Money Back</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Inventory Section */}
      <section className="container inventory-body-layout">
        {/* Top Control Toolbar */}
        <div className="inventory-toolbar-card">
          <div className="toolbar-search-box">
            <Search size={18} className="search-icon-svg" />
            <input 
              aria-label="Search make, model, variant or city" 
              placeholder="Search by brand, model, city, e.g. Hyundai Creta, Honda City..." 
              value={query} 
              onChange={event => setQuery(event.target.value)}
              className="toolbar-search-input"
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery('')} className="search-clear-btn">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="toolbar-controls-right">
            <button className="button button-outline mobile-filter-button" onClick={() => setMobileFilter(true)}>
              <SlidersHorizontal size={15} /> 
              <span>Filters {chips.length > 0 && `(${chips.length})`}</span>
            </button>

            <div className="sort-dropdown-box">
              <span className="sort-label-text">Sort by:</span>
              <select value={sort} onChange={event => setSort(event.target.value)} className="sort-select-input">
                <option value="recommended">Cars21 Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest Listed First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Row */}
        {(chips.length > 0 || source) && (
          <div className="active-filters-bar">
            <div className="active-chips-wrap">
              {chips.map((chip, index) => (
                <button key={`${chip.label}-${index}`} className="active-filter-chip" onClick={chip.clear}>
                  <span>{chip.label}</span>
                  <X size={13} />
                </button>
              ))}
              {chips.length > 0 && (
                <button className="clear-all-chips-btn" onClick={clear}>
                  <RotateCcw size={12} /> Clear all filters
                </button>
              )}
            </div>
            <span className="inventory-source-badge">
              <span className="status-live-dot" />
              {source === 'mongodb' ? 'Live Cars21 Network' : 'Certified Dealer Inventory'}
            </span>
          </div>
        )}

        {/* Main 2-Column Grid (Sticky Filter Sidebar + Car Cards) */}
        <div className="inventory-main-grid">
          {/* Desktop Filter Sidebar */}
          <aside className="inventory-desktop-sidebar">
            <div className="sidebar-header-row">
              <span className="sidebar-title">
                <Filter size={16} /> Filters
              </span>
              {chips.length > 0 && (
                <button onClick={clear} className="sidebar-reset-btn">
                  Reset all
                </button>
              )}
            </div>
            {filtersContent}
          </aside>

          {/* Results Column */}
          <div className="inventory-results-col">
            {error ? (
              <div className="inventory-empty-card">
                <span className="empty-card-icon"><Search size={28} /></span>
                <h3>Unable to Load Vehicles</h3>
                <p>{error}</p>
                <button className="button button-primary" onClick={() => setRetry(value => value + 1)}>
                  Retry Search
                </button>
              </div>
            ) : loading ? (
              <div className="inventory-loading-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="car-card-skeleton">
                    <div className="skeleton-photo shimmer" />
                    <div className="skeleton-body">
                      <div className="skeleton-line shimmer title" />
                      <div className="skeleton-line shimmer sub" />
                      <div className="skeleton-line shimmer specs" />
                      <div className="skeleton-line shimmer price" />
                    </div>
                  </div>
                ))}
              </div>
            ) : result.length > 0 ? (
              <div className="car-grid inventory-card-grid">
                {result.map(car => (
                  <CarCard car={car} key={car.id} />
                ))}
              </div>
            ) : (
              <div className="inventory-empty-card">
                <div className="empty-card-illustration">
                  <CarFront size={48} />
                </div>
                <h3>No Matching Cars Found</h3>
                <p>We couldn't find vehicles matching your selected criteria. Try adjusting your filters or browsing all active stock.</p>
                <div className="empty-quick-actions">
                  <button className="button button-primary" onClick={clear}>
                    Reset All Filters
                  </button>
                  <Link href="/sell-car" className="button button-outline">
                    Request a Vehicle
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Filters Drawer */}
      {mobileFilter && (
        <div className="modal-backdrop" onClick={() => setMobileFilter(false)}>
          <section className="mobile-filter-modal" role="dialog" aria-modal="true" aria-label="Filter car listings" onClick={event => event.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title-bold"><Filter size={17} /> Filter Vehicles</span>
              <button aria-label="Close filters" onClick={() => setMobileFilter(false)} className="modal-close-icon">
                <X size={20} />
              </button>
            </div>
            <div className="mobile-filter-body">
              {filtersContent}
            </div>
            <div className="mobile-filter-footer">
              <button className="button button-outline" onClick={clear}>Reset</button>
              <button className="button button-orange button-full" onClick={() => setMobileFilter(false)}>
                Show {result.length} Cars
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
