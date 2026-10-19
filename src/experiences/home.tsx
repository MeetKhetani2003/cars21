import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '../lib/navigation';
import { ArrowRight, Check, CarFront, ShieldCheck, FileCheck2, TrendingUp, IndianRupee, Heart, BadgeCheck, ChevronDown, CircleHelp, Search, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Car } from '../data';
import { formatShort } from '../data';
import { CarCard } from '../components/CarCard';
import { SectionTitle, TrustStrip } from '../components/shared';

const heroSlides = [
  { image: '/images/hero-main.webp', alt: 'Graphite SUV in a modern architectural setting' },
  { image: '/images/hero-coastal.webp', alt: 'White sedan on a coastal road at sunset' },
  { image: '/images/hero-city.webp', alt: 'Graphite crossover overlooking a city at blue hour' },
];

function HeroCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const hero = carouselRef.current?.parentElement;
    if (!hero) return;
    const onEnter = () => setHovered(true);
    const onLeave = () => setHovered(false);
    const onFocus = () => setFocused(true);
    const onBlur = (event: FocusEvent) => {
      if (!hero.contains(event.relatedTarget as Node | null)) setFocused(false);
    };
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    hero.addEventListener('mouseenter', onEnter);
    hero.addEventListener('mouseleave', onLeave);
    hero.addEventListener('focusin', onFocus);
    hero.addEventListener('focusout', onBlur);
    observer.observe(hero);
    return () => {
      observer.disconnect();
      hero.removeEventListener('mouseenter', onEnter);
      hero.removeEventListener('mouseleave', onLeave);
      hero.removeEventListener('focusin', onFocus);
      hero.removeEventListener('focusout', onBlur);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (paused || hovered || focused || !visible || !pageVisible || reducedMotion) return;
    const timer = window.setInterval(() => setActiveSlide(current => (current + 1) % heroSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, visible, pageVisible, reducedMotion]);

  const move = (direction: number) => setActiveSlide(current => (current + direction + heroSlides.length) % heroSlides.length);

  return <>
    <div className="hero-carousel" ref={carouselRef} role="region" aria-roledescription="carousel" aria-label="Featured Cars21 vehicles">
      {heroSlides.map((slide, index) => <div key={slide.image} className={`hero-slide${activeSlide===index?' is-active':''}`} aria-hidden="true">
        <img src={slide.image} alt="" aria-hidden="true" fetchPriority={index===0?'high':'auto'} loading={index===0?'eager':'lazy'}/>
      </div>)}
    </div>
    <div className="hero-carousel-controls" role="group" aria-label="Hero carousel controls">
      <button type="button" className="hero-carousel-arrow" onClick={()=>move(-1)} aria-label="Previous hero image"><ChevronLeft size={17}/></button>
      <div className="hero-carousel-dots" aria-label={`Slide ${activeSlide+1} of ${heroSlides.length}`}>
        {heroSlides.map((slide,index)=><button key={slide.image} type="button" className={activeSlide===index?'active':''} aria-label={`Show slide ${index+1}: ${slide.alt}`} aria-pressed={activeSlide===index} onClick={()=>setActiveSlide(index)}/>) }
      </div>
      <button type="button" className="hero-carousel-arrow" onClick={()=>move(1)} aria-label="Next hero image"><ChevronRight size={17}/></button>
      <button type="button" className="hero-carousel-arrow hero-carousel-toggle" aria-label={paused?'Play hero images':'Pause hero images'} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button>
    </div>
  </>;
}

type HomeFilters={cities:string[];makes:string[];minPrice:number;maxPrice:number};
export function HomePage(){
  const [city,setCity]=useState('');const [make,setMake]=useState('');const [budget,setBudget]=useState('');const [query,setQuery]=useState('');
  const [filters,setFilters]=useState<HomeFilters>({cities:[],makes:[],minPrice:0,maxPrice:0});const [featuredCars,setFeaturedCars]=useState<Car[]>([]);const nav=useNavigate();
  useEffect(()=>{const controller=new AbortController();Promise.all([fetch('/api/cars/filters',{signal:controller.signal,cache:'no-store'}),fetch('/api/cars?sort=recommended',{signal:controller.signal,cache:'no-store'})]).then(async([filterResponse,carsResponse])=>{if(!filterResponse.ok||!carsResponse.ok)throw new Error('Inventory unavailable');const filterData=await filterResponse.json();const carData=await carsResponse.json();if(controller.signal.aborted)return;setFilters({cities:filterData.cities||[],makes:filterData.makes||[],minPrice:filterData.minPrice||0,maxPrice:filterData.maxPrice||0});setCity(current=>current||filterData.cities?.[0]||'');setFeaturedCars((carData.cars||[]).slice(0,4));}).catch(()=>{});return()=>controller.abort()},[]);
  const priceBands=filters.maxPrice>0?(()=>{const low=Math.round((filters.minPrice||0)/100000)*100000;const high=filters.maxPrice;const first=Math.round((low+(high-low)*.45)/100000)*100000;const second=Math.round((low+(high-low)*.75)/100000)*100000;return [{value:'',label:'Any budget',min:0,max:0},{value:'low',label:`Under ${formatShort(first)}`,min:0,max:first},{value:'mid',label:`${formatShort(first)} – ${formatShort(second)}`,min:first,max:second},{value:'high',label:`${formatShort(second)}+`,min:second,max:0}].filter((band,index,array)=>index===0||index===array.length-1||band.max>band.min)} )():[{value:'',label:'Any budget',min:0,max:0}];
  const submit=(e:React.FormEvent)=>{e.preventDefault();const p=new URLSearchParams();if(city)p.set('city',city);if(query.trim())p.set('q',query.trim());if(make)p.set('make',make);const band=priceBands.find(item=>item.value===budget);if(band?.min)p.set('minPrice',String(band.min));if(band?.max)p.set('maxPrice',String(band.max));nav(`/buy-cars${p.size?`?${p}`:''}`)};
  return <>
<section className="hero"><HeroCarousel/><div className="container hero-content"><div className="hero-copy"><span className="eyebrow eyebrow-light"><i/>A BETTER WAY TO MOVE</span><h1>Your next car.<br/><em>Your best deal.</em></h1><p>Discover thoughtfully verified cars, get a transparent valuation, and move forward with confidence.</p><div className="hero-actions"><Link className="button button-primary" href="/buy-cars">Explore used cars <ArrowRight size={17}/></Link><Link className="button button-outline-light" href="/sell-car">Sell your car <ArrowRight size={17}/></Link></div><div className="hero-trust"><span><ShieldCheck size={16}/> 140+ point checks</span><i/><span><FileCheck2 size={16}/> Clear history</span></div></div><div className="hero-caption"><span>THE CARS21 STANDARD</span><b>Good cars. Good journeys.</b></div></div>
<form className="container search-panel" onSubmit={submit}><div className="search-title"><span className="search-icon"><Search size={18}/></span><div><b>Find a car that feels right</b><small>Search live listings by model, location and price</small></div></div><label className="hero-keyword"><span>Car or model</span><input type="search" placeholder="Try Honda City" value={query} onChange={e=>setQuery(e.target.value)}/></label><label><span>City</span><select value={city} onChange={e=>setCity(e.target.value)}><option value="">All cities</option>{filters.cities.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Make</span><select value={make} onChange={e=>setMake(e.target.value)}><option value="">All makes</option>{filters.makes.map(item=><option key={item}>{item}</option>)}</select></label><label><span>Price range</span><select value={budget} onChange={e=>setBudget(e.target.value)}>{priceBands.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button className="button button-dark search-submit">Search cars <ArrowRight size={16}/></button></form></section>
<section className="container trust-strip-wrap"><TrustStrip/></section>
<section className="section container"><SectionTitle eyebrow="A GOOD PLACE TO START" title="What are you looking for?" copy="Two simple ways to make your next car move."/><div className="intent-grid"><Link href="/buy-cars" className="intent-card"><div className="intent-art"><span className="intent-label">THE BUYING SIDE</span><CarFront size={96}/><span className="intent-circle"><ArrowRight/></span></div><div className="intent-copy"><h3>Find your next car</h3><p>Compare verified cars, see the details clearly, and choose at your pace.</p><span className="text-link">Browse cars <ArrowRight size={15}/></span></div></Link><Link href="/sell-car" className="intent-card intent-sell"><div className="intent-art"><span className="intent-label">THE SELLING SIDE</span><TrendingUp size={92}/><span className="intent-circle"><ArrowRight/></span></div><div className="intent-copy"><h3>Sell with clarity</h3><p>Get an indicative price, book an inspection, and follow every next step.</p><span className="text-link">Get my car price <ArrowRight size={15}/></span></div></Link></div></section>
<section className="section section-soft"><div className="container"><SectionTitle eyebrow="FIND YOUR KIND OF DRIVE" title="Browse by category" copy="A few ways to narrow down the search." link="/buy-cars" linkText="View all cars"/><div className="category-grid">{[{name:'SUVs',body:'SUV',caption:'Room for more',letter:'S'},{name:'Sedans',body:'Sedan',caption:'Made for the miles',letter:'D'},{name:'Hatchbacks',body:'Hatchback',caption:'City-friendly',letter:'H'},{name:'Electric',body:'Electric',caption:'A quieter drive',letter:'E'},{name:'Automatic',body:'Automatic',caption:'Easy in traffic',letter:'A'},{name:'Luxury',body:'Luxury',caption:'A little extra',letter:'L'}].map((c,i)=><Link href={`/buy-cars?body=${c.body}`} className={`category-card category-${i}`} key={c.name}><span className="category-letter">{c.letter}</span><span><b>{c.name}</b><small>{c.caption}</small></span><ArrowRight size={17}/></Link>)}</div></div></section>
<section className="section container"><SectionTitle eyebrow="CURRENT INVENTORY" title="Cars worth a second glance" copy="Browse active listings uploaded by Cars21 and its dealer partners." link="/buy-cars" linkText="See all cars"/>{featuredCars.length?<div className="car-grid">{featuredCars.map(car=><CarCard car={car} key={car.id}/>)}</div>:<div className="home-inventory-empty"><CarFront size={24}/><div><b>No cars are listed right now</b><span>Check back soon or browse dealer profiles.</span></div><Link href="/dealers" className="text-link">Find dealers <ArrowRight size={15}/></Link></div>}</section>
<section className="section split-section"><div className="container split-grid"><div className="split-copy"><span className="eyebrow">SELL WITH CONFIDENCE</span><h2>Know what your car could be worth.</h2><p>Start with a clear, indicative estimate. Then choose an inspection slot that works for you. No commitment at the estimate stage.</p><div className="inline-bullets"><span><Check/> Free to get started</span><span><Check/> Estimate in a few steps</span><span><Check/> You decide what happens next</span></div><a className="button button-dark" href="/sell-car">Get my car price <ArrowRight size={16}/></a></div><div className="valuation-card"><div className="valuation-top"><span><TrendingUp size={16}/> Indicative estimate</span><span className="demo-tag">DEMO</span></div><div className="valuation-number">₹ 8.4 – 9.2 <small>L</small></div><div className="valuation-desc">Illustrative range for a 2020 compact SUV</div><div className="valuation-bars">{Array.from({length:18},(_,i)=><i key={i}/>)}</div><div className="valuation-foot"><span>Market estimate</span><span>Inspection may change offer</span></div></div></div></section>
<section className="section container"><SectionTitle eyebrow="THE CARS21 DIFFERENCE" title="A little more clarity at every turn" copy="The experience is designed to make important details easier to understand."/><div className="benefit-grid">{[{icon:<BadgeCheck/>,title:'A more complete picture',body:'Structured checklists, reported observations, and known gaps shown together.'},{icon:<IndianRupee/>,title:'Pricing without guesswork',body:'See the estimate, the assumptions behind it, and what can change it.'},{icon:<FileCheck2/>,title:'Paperwork with a path',body:'Know the documentation steps and where your car is in the journey.'},{icon:<Heart/>,title:'Support when you need it',body:'An easy way to ask a question or pick up where you left off.'}].map(x=><div className="benefit-card" key={x.title}><div className="benefit-icon">{x.icon}</div><h3>{x.title}</h3><p>{x.body}</p></div>)}</div></section>
<section className="section section-ink"><div className="container"><SectionTitle eyebrow="ONE STEP AT A TIME" title="A clearer car journey" copy="From first search to the final paperwork, know what comes next."/><div className="journey-grid">{[['01','Buying a car',['Find a car that fits','Review details and inspection notes','Book a visit or ask a question','Explore finance options','Complete documentation and delivery'],'/buy-cars'],['02','Selling a car',['Share your car details','Get an indicative estimate','Choose an inspection slot','Review your options before you decide','Follow pickup and transfer status'],'/sell-car']].map(col=><div className="journey-column" key={String(col[1])}><div className="journey-heading"><span className="journey-num">{col[0]}</span><h3>{col[1]}</h3></div>{(col[2] as string[]).map((s,i)=><div className="journey-step" key={s}><span>{String(i+1).padStart(2,'0')}</span><b>{s}</b>{i<4&&<i/>}</div>)}<a className="text-link" href={col[3] as string}>Start this journey <ArrowRight size={15}/></a></div>)}</div></div></section>
<section className="section container"><div className="finance-banner"><div className="finance-art"><div className="finance-orbit orbit-a"/><div className="finance-orbit orbit-b"/><div className="finance-card-visual"><span>LOANS<span>24</span></span><small>YOUR JOURNEY, FINANCED</small><b>EMI that makes sense.</b><div className="mini-chart">{Array.from({length:12},(_,i)=><i key={i}/>)}</div></div></div><div className="finance-copy"><span className="eyebrow">LOANS24 · DEMO CALCULATIONS</span><h2>A little help with the numbers.</h2><p>Explore a sample monthly payment and learn what information a lender may ask for. Rates and approvals shown here are illustrative only.</p><div className="finance-actions"><a className="button button-light" href="/loans24/emi-calculator">Calculate your EMI <ArrowRight size={16}/></a><a className="text-link text-link-light" href="/loans24">Explore finance</a></div></div></div></section>
<section className="section container"><SectionTitle eyebrow="REAL-LIFE DETAILS · ILLUSTRATIVE" title="A little more confidence for the road." copy="Fictional demo stories show the kinds of moments this journey is designed to support."/><div className="story-grid">{[{quote:"I could see the inspection notes before I made the trip. That made the conversation much easier.",name:"Maya R.",detail:"Sample buyer · Bengaluru",stars:5},{quote:"The estimate showed what could change the number. I knew it was a starting point, not a promise.",name:"Arjun K.",detail:"Sample seller · Pune",stars:5},{quote:"Being able to compare the details in one place helped me narrow down what mattered.",name:"Neha S.",detail:"Sample buyer · Mumbai",stars:5}].map(s=><article className="story-card" key={s.name}><div className="story-stars">★★★★★</div><p>“{s.quote}”</p><b>{s.name}</b><small>{s.detail}</small></article>)}</div></section><section className="section section-soft"><div className="container"><SectionTitle eyebrow="GOOD TO KNOW" title="Frequently asked questions"/><div className="faq-grid">{[['Are the cars and prices on this site real?','No. Cars21 is a frontend demo. Inventory, prices, inspection notes, and personas are illustrative sample data.'],['Does the valuation guarantee a final offer?','No. The estimate is indicative and may change after vehicle details and an inspection are reviewed.'],['Can I book an actual inspection?','You can walk through the demo booking flow, but no inspector is dispatched and no real appointment is created.'],['Are finance approvals or bids live?','No. EMI calculations use your inputs. Dealer bidding is simulated locally and is not connected to a live marketplace.']].map(f=><details className="faq-item" key={f[0]}><summary><span>{f[0]}</span><ChevronDown size={17}/></summary><p>{f[1]}</p></details>)}</div></div></section></>}





