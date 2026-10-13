import { Heart, Gauge, Fuel, Settings2, ArrowUpRight, MapPin, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from '../lib/navigation';
import { useState } from 'react';
import type { Car } from '../data';
import { calcEmi, formatINR } from '../data';
export function CarCard({car,compact=false}:{car:Car;compact?:boolean}){
  const [saved,setSaved]=useState(false);
  return <article className={'car-card '+(compact?'compact':'')}>
    <div className={'car-photo '+car.accent}><Link to={`/car/${car.id}`} aria-label={`View ${car.year} ${car.make} ${car.model}`}><img src={car.image} alt={`${car.color} ${car.year} ${car.make} ${car.model}`} loading="lazy"/></Link><span className="photo-badge"><ShieldCheck size={13}/> {car.badge}</span><button className={'favorite '+(saved?'saved':'')} onClick={()=>setSaved(!saved)} aria-label={saved?'Remove from saved cars':'Save car'}><Heart size={17} fill={saved?'currentColor':'none'}/></button></div>
    <div className="car-card-body"><div className="car-title-row"><Link to={`/car/${car.id}`} className="car-name">{car.year} {car.make} {car.model}</Link><span className="score-pill">{car.score}<small>/100</small></span></div><p className="car-variant">{car.variant}</p><div className="spec-row"><span><Gauge size={14}/>{(car.km/1000).toFixed(1)}k km</span><span><Fuel size={14}/>{car.fuel}</span><span><Settings2 size={14}/>{car.transmission==='Automatic'?'Auto':'Manual'}</span></div><div className="car-price-row"><div><strong>{formatINR(car.price)}</strong><small>EMI from {formatINR(Math.round(calcEmi(car.price*.8,10.5,60)))}/mo</small></div><Link className="icon-arrow" to={`/car/${car.id}`} aria-label={`View details for ${car.make} ${car.model}`}><ArrowUpRight size={18}/></Link></div><div className="car-card-location"><MapPin size={13}/>{car.city} <span>·</span> {car.owners} owner{car.owners>1?'s':''}<ChevronRight size={13}/></div></div>
  </article>
}

