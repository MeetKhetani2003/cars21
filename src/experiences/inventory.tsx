import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from '../lib/navigation';
import { Search, Filter, SlidersHorizontal, X, ChevronRight } from 'lucide-react';
import type { Car } from '../data';
import { formatShort } from '../data';
import { CarCard } from '../components/CarCard';
import { PageHero } from '../components/shared';

type InventoryResponse = { cars: Car[]; count: number; source: 'mongodb' | 'demo'; error?: string };
type FilterOptions = { cities: string[]; makes: string[]; models: string[]; fuels: string[]; bodyTypes: string[]; transmissions: string[]; minPrice: number; maxPrice: number; source: string };
const emptyOptions: FilterOptions = { cities: [], makes: [], models: [], fuels: [], bodyTypes: [], transmissions: [], minPrice: 0, maxPrice: 0, source: '' };

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
  const filters = <>
    <label className="filter-label">City<select value={city} onChange={event => setCity(event.target.value)}><option value="">All cities</option>{options.cities.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="filter-label">Make<select value={make} onChange={event => { setMake(event.target.value); setModel(''); }}><option value="">All makes</option>{options.makes.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="filter-label">Model<select value={model} onChange={event => setModel(event.target.value)}><option value="">All models</option>{options.models.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="filter-label">Fuel<select value={fuel} onChange={event => setFuel(event.target.value)}><option value="">Any fuel</option>{options.fuels.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="filter-label">Body type<select value={body} onChange={event => setBody(event.target.value)}><option value="">Any body type</option>{options.bodyTypes.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="filter-label">Transmission<select value={transmission} onChange={event => setTransmission(event.target.value)}><option value="">Any transmission</option>{options.transmissions.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="filter-label range-label">Minimum price <b>{minPrice ? formatShort(minPrice) : 'Any price'}</b><input type="range" min={options.minPrice} max={sliderMax} step={Math.max(10000, Math.round((sliderMax - options.minPrice) / 100))} value={minSliderValue} disabled={options.maxPrice <= options.minPrice} aria-label="Set minimum car price" onChange={event => { const value = Number(event.target.value); setMinPrice(value <= options.minPrice ? 0 : value); if (maxPrice && value >= maxPrice) setMaxPrice(0); }}/><span className="range-minmax"><small>{options.minPrice ? formatShort(options.minPrice) : '—'}</small><small>{options.maxPrice ? `${formatShort(options.maxPrice)}+` : '—'}</small></span></label>
    <label className="filter-label range-label">Maximum price <b>{maxPrice ? formatShort(maxPrice) : 'Any price'}</b><input type="range" min={maxSliderMinimum} max={sliderMax} step={Math.max(10000, Math.round((sliderMax - options.minPrice) / 100))} value={Math.max(maxSliderMinimum, sliderValue)} disabled={options.maxPrice <= options.minPrice} aria-label="Set maximum car price" onChange={event => { const value = Number(event.target.value); setMaxPrice(value >= options.maxPrice ? 0 : value); }}/><span className="range-minmax"><small>{formatShort(maxSliderMinimum)}</small><small>{options.maxPrice ? `${formatShort(options.maxPrice)}+` : '—'}</small></span></label>
  </>;
  const chips = [
    ...(query ? [{ label: query, clear: () => setQuery('') }] : []), ...(city ? [{ label: city, clear: () => setCity('') }] : []),
    ...(make ? [{ label: make, clear: () => { setMake(''); setModel(''); } }] : []), ...(model ? [{ label: model, clear: () => setModel('') }] : []),
    ...(fuel ? [{ label: fuel, clear: () => setFuel('') }] : []), ...(body ? [{ label: body, clear: () => setBody('') }] : []),
    ...(transmission ? [{ label: transmission, clear: () => setTransmission('') }] : []),
    ...(minPrice ? [{ label: `From ${formatShort(minPrice)}`, clear: () => setMinPrice(0) }] : []),
    ...(maxPrice ? [{ label: `Up to ${formatShort(maxPrice)}`, clear: () => setMaxPrice(0) }] : []),
  ];

  return <>
    <PageHero eyebrow="THE MARKETPLACE" title="Find your next car." copy="Search by city, make or model. Narrow the results by real listing prices and vehicle details."/>
    <section className="container listing-section">
      <div className="listing-toolbar"><div><div className="crumb"><Link href="/">Home</Link><ChevronRight size={14}/><span>Buy cars</span></div><h2>Used cars for sale</h2><p role="status" aria-live="polite">{loading ? 'Searching cars…' : `${result.length} ${result.length === 1 ? 'car' : 'cars'} match your search`}</p></div>
        <div className="listing-search"><Search size={17}/><input aria-label="Search make, model, variant or city" placeholder="Search make, model, variant or city" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14}/></button>}</div>
        <button className="button button-outline mobile-filter-button" onClick={() => setMobileFilter(true)}><SlidersHorizontal size={16}/> Filters</button>
        <label className="sort-control">Sort by <select value={sort} onChange={event => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="newest">Newest first</option></select></label>
      </div>
      <div className="active-filters">{chips.map((chip, index) => <button key={`${chip.label}-${index}`} className="filter-chip" onClick={chip.clear}>{chip.label}<X size={13}/></button>)}{chips.length ? <button className="clear-filters" onClick={clear}>Clear all</button> : <span className="demo-inline"><i/>{source === 'mongodb' ? 'Live Cars21 listings' : source === 'demo' ? 'Sample listings' : 'Filters match current listings'}</span>}</div>
      <div className="listing-layout"><aside className="filter-panel"><div className="filter-heading"><span><Filter size={16}/> Refine your search</span><button onClick={clear}>Reset</button></div>{filters}<div className="filter-note">Filter choices come from active vehicle listings.</div></aside>
        <div className="listing-results">{error ? <div className="empty-state"><span className="empty-icon"><Search/></span><h3>We couldn’t load cars</h3><p>{error}</p><button className="button button-dark" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : loading ? <div className="inventory-loading" role="status"><span className="loading-spinner"/> Searching cars that match…</div> : result.length ? <div className="car-grid listing-grid">{result.map(car => <CarCard car={car} key={car.id}/>)}</div> : <div className="empty-state"><span className="empty-icon"><Search/></span><h3>No cars match these filters</h3><p>Change your city, model or price, or clear filters to see more vehicles.</p><button className="button button-dark" onClick={clear}>Clear filters</button></div>}</div>
      </div>
    </section>
    {mobileFilter && <div className="modal-backdrop" onClick={() => setMobileFilter(false)}><section className="mobile-filter-modal" role="dialog" aria-modal="true" aria-label="Filter car listings" onClick={event => event.stopPropagation()}><div className="modal-head"><b>Filter cars</b><button aria-label="Close filters" onClick={() => setMobileFilter(false)}><X/></button></div>{filters}<button className="button button-dark button-full" onClick={() => setMobileFilter(false)}>Show {result.length} cars</button></section></div>}
  </>;
}
