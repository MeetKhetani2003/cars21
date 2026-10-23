'use client';

import { Heart, Gauge, Fuel, Settings2, ArrowUpRight, MapPin, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from '../lib/navigation';
import { useState } from 'react';
import type { Car } from '../data';
import { calcEmi, formatINR } from '../data';
import { useBuyerExperience } from './BuyerExperienceProvider';
export function CarCard({car,compact=false}:{car:Car;compact?:boolean}){
  const {wishlistIds,toggleWishlist,loadingBuyer}=useBuyerExperience();
  const saved=wishlistIds.includes(car.id);
  const [saving,setSaving]=useState(false);
  const [feedback,setFeedback]=useState('');

  async function toggle(){
    if(saving||loadingBuyer)return;
    setSaving(true);
    setFeedback('');
    const result=await toggleWishlist(car.id);
    if(result==='error')setFeedback('Could not update wishlist. Try again.');
    setSaving(false);
  }

  const emiVal = Math.round(calcEmi(car.price * 0.8, 10.5, 60));

  return (
    <article className={'car-card ' + (compact ? 'compact' : '')}>
      <div className={'car-photo ' + car.accent}>
        <Link to={`/car/${car.id}`} aria-label={`View ${car.year} ${car.make} ${car.model}`} className="car-photo-link">
          <img src={car.image} alt={`${car.color} ${car.year} ${car.make} ${car.model}`} loading="lazy" />
        </Link>
        <div className="photo-badges-wrap">
          <span className="photo-badge assured-badge">
            <ShieldCheck size={13} /> {car.badge || 'Cars21 Assured'}
          </span>
          <span className="photo-badge-return">7-Day Return</span>
        </div>
        <button 
          type="button" 
          className={'favorite ' + (saved ? 'saved' : '')} 
          onClick={() => void toggle()} 
          aria-label={saved ? 'Remove from saved cars' : `Save ${car.make} ${car.model}`} 
          aria-pressed={saved} 
          disabled={saving || loadingBuyer}
        >
          {saving ? <span className="wishlist-spinner" aria-hidden="true" /> : <Heart size={16} fill={saved ? 'currentColor' : 'none'} />}
        </button>
        {feedback && <span className="wishlist-card-feedback" role="status">{feedback}</span>}
      </div>

      <div className="car-card-body">
        <div className="car-title-row">
          <Link to={`/car/${car.id}`} className="car-name">
            {car.year} {car.make} {car.model}
          </Link>
          <span className="score-pill">
            <span className="score-pill-dot" />
            {car.score}<small>/100</small>
          </span>
        </div>

        <p className="car-variant">{car.variant}</p>

        <div className="spec-row">
          <span className="spec-chip">
            <Gauge size={13} /> {(car.km / 1000).toFixed(1)}k km
          </span>
          <span className="spec-chip">
            <Fuel size={13} /> {car.fuel}
          </span>
          <span className="spec-chip">
            <Settings2 size={13} /> {car.transmission === 'Automatic' ? 'Auto' : 'Manual'}
          </span>
        </div>

        <div className="car-price-row">
          <div>
            <strong className="car-price-tag">{formatINR(car.price)}</strong>
            <div className="car-emi-pill">
              <span>EMI from {formatINR(emiVal)}/mo</span>
            </div>
          </div>
          <Link className="icon-arrow" to={`/car/${car.id}`} aria-label={`View details for ${car.make} ${car.model}`}>
            <ArrowUpRight size={17} />
          </Link>
        </div>

        <div className="car-card-location">
          <span className="loc-text">
            <MapPin size={13} /> {car.city}{car.area ? ` · ${car.area}` : ''}
          </span>
          <span className="owners-text">{car.owners} owner{car.owners > 1 ? 's' : ''}</span>
          <ChevronRight size={13} className="loc-arrow" />
        </div>

        {car.vendorSlug && (
          <Link className="car-vendor-link" to={`/dealers/${car.vendorSlug}`}>
            Sold by {car.vendorName || 'dealer'} <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
    </article>
  );
}

