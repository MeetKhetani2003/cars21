'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from '../lib/navigation';
import { ArrowRight, Check, ChevronRight, Fuel, Gauge, Heart, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { cars, calcEmi, formatINR, type Car } from '../data';
import { CarCard } from '../components/CarCard';
import { SectionTitle } from '../components/shared';

type EnquiryState = 'idle' | 'saving' | 'saved' | 'error';

export function CarPage() {
  const { carId } = useParams();
  const [car, setCar] = useState<Car>(() => cars.find(item => item.id === carId) || cars[0]);
  const [tab, setTab] = useState('Overview');
  const [saved, setSaved] = useState(false);
  const [enquiryState, setEnquiryState] = useState<EnquiryState>('idle');
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    if (!carId) return;
    const controller = new AbortController();
    fetch(`/api/cars/${encodeURIComponent(carId)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => { if (payload?.car) setCar(payload.car as Car); })
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
      setFormMessage('Your request is saved. Opening WhatsApp with the car and contact details…');
      if (result.whatsappUrl) {
        window.location.assign(result.whatsappUrl);
      } else {
        setFormMessage('Your request is saved. WhatsApp is not configured for this seller yet.');
      }
    } catch (error) {
      setEnquiryState('error');
      setFormMessage(error instanceof Error ? error.message : 'We could not save your request. Please try again.');
    }
  }

  return <>
    <div className="container detail-breadcrumb">
      <div className="crumb"><Link to="/">Home</Link><ChevronRight size={14}/><Link to="/buy-cars">Buy cars</Link><ChevronRight size={14}/><span>{car.make} {car.model}</span></div>
    </div>
    <section className="container detail-main">
      <div className="detail-gallery">
        <div className={'detail-main-photo '+car.accent}><img src={car.image} alt={`${car.color} ${car.year} ${car.make} ${car.model}`}/><span className="photo-count">01 / 08 · Listing photos</span></div>
        <div className="gallery-thumbs">{[1,2,3,4].map(number=><button key={number} className={`thumb photo-${['one','two','three','four'][number-1]}`} aria-label={`Show photo ${number}`}><img src={car.image} alt=""/></button>)}<button className="more-photos">+4 photos</button></div>
        <div className="seller-contact-strip"><span className="seller-avatar"><UserRound size={18}/></span><span><small>SELLER</small><b>{car.sellerName || 'Cars21 verified seller'}</b></span><span className="seller-phone"><Phone size={14}/>{car.sellerPhone || 'Contact after enquiry'}</span></div>
      </div>
      <div className="detail-panel">
        <div className="detail-badges"><span className="verification-badge"><ShieldCheck size={15}/>{car.badge}</span></div>
        <h1>{car.year} {car.make} {car.model}</h1>
        <p className="detail-variant">{car.variant} · {car.color}</p>
        <div className="detail-price">{formatINR(car.price)} <small>Asking price · confirm with seller</small></div>
        <div className="detail-emi">EMI from <b>{formatINR(Math.round(calcEmi(car.price*.8,10.5,60)))}/mo</b><Link to="/loans24/emi-calculator">Calculate <ArrowRight size={13}/></Link></div>
        <div className="spec-tiles">{[[car.year,'Year'],[`${(car.km/1000).toFixed(1)}k km`,'Driven'],[car.fuel,'Fuel'],[car.transmission,'Transmission'],[`${car.owners} owner`,'Ownership'],[car.city,'Location']].map(([value,label])=><div key={label}><b>{value}</b><small>{label}</small></div>)}</div>
        <div className="inspection-score"><div className="score-ring">{car.score}</div><div><b>Inspection score</b><p>View the vehicle report before you book.</p><button onClick={()=>setTab('Inspection report')}>View inspection report <ArrowRight size={13}/></button></div></div>
        <div className="detail-ctas"><a className="button button-primary" href="#book-visit">Book a visit <ArrowRight size={16}/></a><button className={'button button-outline '+(saved?'is-saved':'')} onClick={()=>setSaved(!saved)}><Heart size={16} fill={saved?'currentColor':'none'}/> {saved?'Saved':'Save car'}</button></div>
        <p className="detail-disclosure">Listing details are shared with the seller when you enquire. Please confirm availability, price, and documents before visiting.</p>
        <form key={car.id} id="book-visit" className="booking-enquiry-card" onSubmit={submitEnquiry}>
          <div className="booking-card-heading"><span className="booking-card-icon"><MapPin size={18}/></span><div><span className="eyebrow">NEXT STEP</span><h2>Book a visit or request a call</h2><p>We’ll save your request and open WhatsApp with the car and your details ready to send.</p></div></div>
          <div className="enquiry-fields">
            <label className="field-label">Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Full name"/></label>
            <label className="field-label">Mobile number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required pattern="\+?[\d\s()-]{10,18}" title="Enter a phone number with 10 to 15 digits" placeholder="+91 98765 43210"/></label>
            <label className="field-label">Email <span className="field-optional">Optional</span><input name="email" type="email" autoComplete="email" maxLength={160} placeholder="you@example.com"/></label>
            <label className="field-label">Your city<input name="city" autoComplete="address-level2" required minLength={2} maxLength={80} defaultValue={car.city} placeholder="City"/></label>
            <label className="field-label">Preferred visit date <span className="field-optional">Optional</span><input name="preferredDate" type="date" min={new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date())}/></label>
            <label className="field-label">Preferred time <span className="field-optional">Optional</span><input name="preferredTime" type="time"/></label>
          </div>
          <label className="field-label">Message <span className="field-optional">Optional</span><textarea name="message" rows={3} maxLength={1000} placeholder="I’d like to schedule a visit…"/></label>
          <label className="enquiry-consent"><input type="checkbox" required/><span>I agree to share my contact details with Cars21 and the seller for this enquiry.</span></label>
          <button className="button button-primary button-full enquiry-submit" type="submit" disabled={enquiryState==='saving'}>{enquiryState==='saving'?'Saving your request…':'Save enquiry & continue to WhatsApp'} {enquiryState==='saving'?<span className="loading-spinner"/>:<ArrowRight size={16}/>}</button>
          {formMessage&&<p className={`enquiry-message ${enquiryState==='error'?'is-error':'is-success'}`} role="status">{enquiryState==='saved'&&<Check size={16}/>} {formMessage}</p>}
          <p className="enquiry-privacy">Your information is stored securely so our team can follow up. WhatsApp opens only after the enquiry is saved.</p>
        </form>
      </div>
    </section>
    <section className="container detail-lower">
      <div className="tab-bar" role="tablist" aria-label="Vehicle information">{['Overview','Inspection report','Documents'].map(name=><button role="tab" aria-selected={tab===name} className={tab===name?'active':''} onClick={()=>setTab(name)} key={name}>{name}</button>)}</div>
      {tab==='Overview'?<div className="detail-overview"><div><h2>Details for this {car.make} {car.model}</h2><p>Review the vehicle information, then ask the seller to confirm any details before making a visit.</p><div className="feature-chips"><span>{car.owners} owner</span><span>{car.transmission}</span><span>{car.fuel}</span><span>{car.color}</span></div></div><div className="overview-box"><b>Vehicle summary</b><p>{car.year} {car.make} {car.model} · {car.variant}<br/>{car.km.toLocaleString('en-IN')} km · {car.city}</p></div></div>:tab==='Inspection report'?<div className="report-grid">{[['Exterior','Review','Confirm visible condition with seller'],['Engine & transmission','Review','Ask about service history'],['Tyres & brakes','Review','Check wear at your visit'],['Electrical','Review','Confirm features in person'],['Documents','Confirm','Verify original documents']].map(row=><div className="report-row" key={row[0]}><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></div>)}</div>:<div className="overview-box"><h3>Documents to review</h3><p>Ask the seller to show the registration certificate, insurance, and service records when you visit.</p></div>}
    </section>
    <section className="section container"><SectionTitle eyebrow="KEEP LOOKING" title="You may also like" link="/buy-cars"/><div className="car-grid">{cars.filter(item=>item.id!==car.id).slice(0,4).map(item=><CarCard key={item.id} car={item}/>)}</div></section>
  </>;
}
