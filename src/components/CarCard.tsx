'use client';

import { Heart, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from '../lib/navigation';
import type { Car } from '../data';
import { formatINR } from '../data';
import { useBuyerExperience } from './BuyerExperienceProvider';

export function CarCard({ car, compact = false }: { car: Car; compact?: boolean }) {
  const { buyer, wishlistIds, toggleWishlist, loadingBuyer, isLeadCaptured, openBuyCarLeadModal, openLoginModal } = useBuyerExperience();
  const saved = wishlistIds.includes(car.id);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const nav = useNavigate();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving || loadingBuyer) return;
    setSaving(true);
    setFeedback('');
    const result = await toggleWishlist(car.id);
    if (result === 'error') setFeedback('Could not update wishlist.');
    setSaving(false);
  }

  const handleCardOrViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. If lead is not captured yet, collect lead (name, number, city) first
    if (!isLeadCaptured) {
      openBuyCarLeadModal(() => {
        if (!buyer) {
          openLoginModal(`/car/${car.id}`);
        } else {
          nav(`/car/${car.id}`);
        }
      });
      return;
    }

    // 2. Lead is captured, but detailed vehicle info & diagnostics require login
    if (!buyer) {
      openLoginModal(`/car/${car.id}`);
      return;
    }

    // 3. User is logged in & lead captured -> go to car details
    nav(`/car/${car.id}`);
  };

  return (
    <article 
      className={'car-card minimal-car-card ' + (compact ? 'compact' : '')}
      onClick={handleCardOrViewClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardOrViewClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      {/* 1. CAR IMAGE */}
      <div className="car-photo">
        <img
          src={car.image}
          alt={`${car.year} ${car.make} ${car.model}`}
          loading="lazy"
          className="car-photo-img"
        />
        <button
          type="button"
          className={'favorite ' + (saved ? 'saved' : '')}
          onClick={toggle}
          aria-label={saved ? 'Remove from saved cars' : `Save ${car.make} ${car.model}`}
          aria-pressed={saved}
          disabled={saving || loadingBuyer}
        >
          {saving ? (
            <span className="wishlist-spinner" aria-hidden="true" />
          ) : (
            <Heart size={15} fill={saved ? '#ef4444' : 'none'} color={saved ? '#ef4444' : 'currentColor'} />
          )}
        </button>
        {feedback && <span className="wishlist-card-feedback" role="status">{feedback}</span>}
      </div>

      {/* 2. MINIMAL BODY: MODEL YEAR, NAME, PRICE & VIEW CAR BUTTON */}
      <div className="car-card-body">
        <div className="car-title-block">
          <h3 className="car-name" title={`${car.year} ${car.make} ${car.model}`}>
            <span className="car-year">{car.year}</span> {car.make} {car.model}
          </h3>
        </div>

        <div className="car-price-row">
          <strong className="car-price-tag">{formatINR(car.price)}</strong>
        </div>

        <button
          type="button"
          className="card-view-car-btn"
          onClick={handleCardOrViewClick}
          aria-label={`View ${car.year} ${car.make} ${car.model}`}
        >
          <span>View Car</span>
          <ArrowRight size={13} className="view-btn-arrow" />
        </button>
      </div>
    </article>
  );
}
