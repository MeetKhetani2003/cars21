'use client';

import { Heart, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from '../lib/navigation';
import type { Car } from '../data';
import { formatINR } from '../data';
import { useBuyerExperience } from './BuyerExperienceProvider';

export function CarCard({ car, compact = false }: { car: Car; compact?: boolean }) {
  const { buyer, wishlistIds, toggleWishlist, loadingBuyer, isLeadCaptured, openBuyCarLeadModal, recordAction } = useBuyerExperience();
  const saved = wishlistIds.includes(car.id);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const nav = useNavigate();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving || loadingBuyer) return;

    if (!isLeadCaptured && !buyer) {
      openBuyCarLeadModal(() => {
        void toggleWishlist(car.id);
        void recordAction({
          action: 'button_click',
          buttonName: 'Wishlist Favorite',
          carId: car.id,
          details: `Favorited ${car.year} ${car.make} ${car.model}`
        });
      });
      return;
    }

    setSaving(true);
    setFeedback('');
    void recordAction({
      action: 'button_click',
      buttonName: saved ? 'Wishlist Remove' : 'Wishlist Add',
      carId: car.id,
      details: `${saved ? 'Removed' : 'Added'} ${car.year} ${car.make} ${car.model}`
    });
    const result = await toggleWishlist(car.id);
    if (result === 'error') setFeedback('Could not update wishlist.');
    setSaving(false);
  }

  const handleCardOrViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. If lead is not captured yet, collect lead (name, number, city) first
    if (!isLeadCaptured && !buyer) {
      openBuyCarLeadModal(() => {
        void recordAction({
          action: 'button_click',
          buttonName: 'View Car Card',
          carId: car.id,
          details: `Opened ${car.year} ${car.make} ${car.model} (${car.city}) after lead capture`
        });
        nav(`/car/${car.id}`);
      });
      return;
    }

    // 2. Lead is captured -> log click action and navigate directly (NO Google login required)
    void recordAction({
      action: 'button_click',
      buttonName: 'View Car Card',
      carId: car.id,
      details: `Opened ${car.year} ${car.make} ${car.model} (${car.city})`
    });
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
