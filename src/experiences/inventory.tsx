import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from '../lib/navigation';
import { Search, Filter, SlidersHorizontal, X, ChevronRight } from 'lucide-react';
import type { Car } from '../data';
import { formatShort } from '../data';
import { CarCard } from '../components/CarCard';
import { PageHero } from '../components/shared';

type InventoryResponse = { cars: Car[]; count: number; source: 'mongodb' | 'demo'; error?: string };

export function InventoryPage(){
  const {city:routeCity}=useParams<{city?:string}>();
  const [params,setParams]=useSearchParams();
  const budget=params.get('budget')||'';
  const [query,setQuery]=useState(params.get('q')||'');
  const [make,setMake]=useState(params.get('make')||'');
  const [city,setCity]=useState(params.get('city')||routeCity||'');
  const [fuel,setFuel]=useState(params.get('fuel')||'');
  const [body,setBody]=useState(params.get('body')||'');
  const [minPrice,setMinPrice]=useState(Number(params.get('minPrice')||(budget==='₹15 lakh+'?1500000:0)));
  const [maxPrice,setMaxPrice]=useState(()=>{const initial=params.get('maxPrice');if(initial)return Number(initial);return budget==='Under ₹8 lakh'?800000:budget==='₹8–15 lakh'?1500000:2500000});
  const [sort,setSort]=useState(params.get('sort')||'recommended');
  const [mobileFilter,setMobileFilter]=useState(false);
  const [result,setResult]=useState<Car[]>([]);
  const [source,setSource]=useState<'mongodb'|'demo'|''>('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);

  const filterKey=useMemo(()=>JSON.stringify({query,make,city,fuel,body,minPrice,maxPrice,sort}),[query,make,city,fuel,body,minPrice,maxPrice,sort]);
  useEffect(()=>{
    const filters=JSON.parse(filterKey) as {query:string;make:string;city:string;fuel:string;body:string;minPrice:number;maxPrice:number;sort:string};
    const search=new URLSearchParams();
    if(filters.query.trim())search.set('q',filters.query.trim());
    if(filters.make)search.set('make',filters.make);
    if(filters.city)search.set('city',filters.city);
    if(filters.fuel)search.set('fuel',filters.fuel);
    if(filters.body)search.set('body',filters.body);
    if(filters.minPrice>0)search.set('minPrice',String(filters.minPrice));
    if(filters.maxPrice<2500000)search.set('maxPrice',String(filters.maxPrice));
    if(filters.sort!=='recommended')search.set('sort',filters.sort);
    setParams(search);

    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError('');
      try{
        const response=await fetch(`/api/cars?${search.toString()}`,{signal:controller.signal,headers:{Accept:'application/json'}});
        const payload=await response.json() as InventoryResponse;
        if(!response.ok)throw new Error(payload.error||'Could not load inventory.');
        setResult(payload.cars);setSource(payload.source);
      }catch(reason){
        if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Could not load inventory.');
      }finally{if(!controller.signal.aborted)setLoading(false)}
    },180);
    return ()=>{window.clearTimeout(timer);controller.abort()};
  },[filterKey,retry,setParams]);

  const clear=()=>{setQuery('');setMake('');setCity('');setFuel('');setBody('');setMinPrice(0);setMaxPrice(2500000);setSort('recommended')};
  const filters=<><label className="filter-label">Make<select value={make} onChange={e=>setMake(e.target.value)}><option value="">All makes</option>{['Honda','Hyundai','Tata','Kia','Maruti Suzuki','Volkswagen','Toyota'].map(x=><option key={x}>{x}</option>)}</select></label><label className="filter-label">City<select value={city} onChange={e=>setCity(e.target.value)}><option value="">All cities</option>{['Bengaluru','Mumbai','Delhi NCR','Pune','Hyderabad','Chennai'].map(x=><option key={x}>{x}</option>)}</select></label><label className="filter-label">Fuel type<select value={fuel} onChange={e=>setFuel(e.target.value)}><option value="">Any fuel</option><option>Petrol</option><option>Diesel</option><option>Electric</option></select></label><label className="filter-label">Body type<select value={body} onChange={e=>setBody(e.target.value)}><option value="">Any body type</option><option>SUV</option><option>Sedan</option><option>Hatchback</option><option>Electric</option><option>Automatic</option><option>Luxury</option></select></label><label className="filter-label range-label">Max budget <b>{formatShort(maxPrice)}</b><input type="range" min={Math.min(500000,minPrice)} max="2500000" step="50000" value={maxPrice} onChange={e=>setMaxPrice(+e.target.value)}/><span className="range-minmax"><small>₹5L</small><small>₹25L+</small></span></label></>;

  return <><PageHero eyebrow="THE MARKETPLACE" title="Cars that feel like the right fit." copy="Search the inventory, compare the details, and keep the shortlist that works for you."/><section className="container listing-section"><div className="listing-toolbar"><div><div className="crumb"><Link href="/">Home</Link><ChevronRight size={14}/><span>Buy cars</span></div><h2>Explore used cars</h2><p>{loading?'Searching cars…':`${result.length} cars match your search`}</p></div><div className="listing-search"><Search size={17}/><input aria-label="Search cars" placeholder="Search make, model, city" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</div><button className="button button-outline mobile-filter-button" onClick={()=>setMobileFilter(true)}><SlidersHorizontal size={16}/> Filters</button><label className="sort-control">Sort by <select value={sort} onChange={e=>setSort(e.target.value)}><option value="recommended">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="newest">Newest first</option></select></label></div>
  <div className="active-filters">{[make,city,fuel,body,query].filter(Boolean).map((f,i)=><button key={`${f}-${i}`} className="filter-chip" onClick={()=>{if(f===query)setQuery('');else if(f===make)setMake('');else if(f===city)setCity('');else if(f===fuel)setFuel('');else if(f===body)setBody('')}}>{f}<X size={13}/></button>)}{(make||city||fuel||body||query||minPrice>0||maxPrice<2500000)?<button className="clear-filters" onClick={clear}>Clear all</button>:<span className="demo-inline"><i/>{source==='mongodb'?'Cars21 inventory':'Demo inventory · Sample prices'}</span>}</div>
  <div className="listing-layout"><aside className="filter-panel"><div className="filter-heading"><span><Filter size={16}/> Refine your search</span><button onClick={clear}>Reset</button></div>{filters}<div className="filter-note">{source==='mongodb'?'Results update from the Cars21 inventory.':'Filters update the sample inventory.'}</div></aside><div className="listing-results">{error?<div className="empty-state"><span className="empty-icon"><Search/></span><h3>We couldn’t load cars</h3><p>{error}</p><button className="button button-dark" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>:loading?<div className="inventory-loading" role="status"><span className="loading-spinner"/> Searching cars that match…</div>:result.length?<div className="car-grid listing-grid">{result.map(c=><CarCard car={c} key={c.id}/>)}</div>:<div className="empty-state"><span className="empty-icon"><Search/></span><h3>No cars found for these filters</h3><p>Try another make or city, increase your budget, or clear a filter.</p><button className="button button-dark" onClick={clear}>Clear filters</button></div>}</div></div></section>{mobileFilter&&<div className="modal-backdrop" onClick={()=>setMobileFilter(false)}><div className="mobile-filter-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><b>Filters</b><button aria-label="Close filters" onClick={()=>setMobileFilter(false)}><X/></button></div>{filters}<button className="button button-dark button-full" onClick={()=>setMobileFilter(false)}>Show {result.length} cars</button></div></div>}</>;
}


