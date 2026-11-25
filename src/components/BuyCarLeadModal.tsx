'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRight, Check, CheckCircle2, MapPin, MessageSquareText, ShieldCheck, Sparkles, User, X } from 'lucide-react';
import { sortCityNames } from '../lib/cities';

const DEFAULT_POPULAR_METROS = [
  'Junagadh',
  'Rajkot',
  'Ahmedabad',
  'Surat',
  'Vadodara',
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Hyderabad'
];

const DEFAULT_ALL_CITIES = [
  'Junagadh',
  'Rajkot',
  'Ahmedabad',
  'Surat',
  'Vadodara',
  'Jamnagar',
  'Bhavnagar',
  'Gandhinagar',
  'Gondal',
  'Jetpur',
  'Morbi',
  'Porbandar',
  'Amreli',
  'Veraval',
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Jaipur',
  'Indore',
  'Other'
];

export function BuyCarLeadModal({
  open,
  onClose,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (lead: { name: string; phone: string; city: string }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Junagadh');
  const [customCity, setCustomCity] = useState('');
  const [allCities, setAllCities] = useState<string[]>(DEFAULT_ALL_CITIES);
  const [popularMetros, setPopularMetros] = useState<string[]>(DEFAULT_POPULAR_METROS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Prepopulate city from localStorage or active setting, and load registered cities
  useEffect(() => {
    try {
      const savedCity = localStorage.getItem('cars21_city');
      if (savedCity && savedCity !== 'All Cities' && savedCity !== 'Pan-India') {
        setCity(savedCity);
      }
    } catch {}

    fetch('/api/admin/cities')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.cities) && data.cities.length > 0) {
          const active = data.cities.filter((c: any) => c.status !== 'inactive');
          const metaLookup: Record<string, { state?: string; pincode?: string; popular?: boolean }> = {};
          active.forEach((c: any) => {
            if (c.name) {
              metaLookup[String(c.name).trim().toLowerCase()] = {
                state: String(c.state || ''),
                pincode: String(c.pincode || ''),
                popular: Boolean(c.popular)
              };
            }
          });
          const names = active.map((c: any) => c.name);
          setAllCities(prev => sortCityNames([...new Set([...names, ...prev])], metaLookup));
          const pop = active.filter((c: any) => c.popular).map((c: any) => c.name);
          if (pop.length > 0) {
            setPopularMetros(prev => sortCityNames([...new Set([...pop, ...prev])], metaLookup));
          }
        }
      })
      .catch(() => {});
  }, []);

  const cleanDigits = phone.replace(/\D/g, '').slice(0, 10);
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanDigits);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const keyHandler = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', keyHandler);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', keyHandler);
      previous?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(false);
  }, [open]);

  const activeCity = city === 'Other' ? (customCity.trim() || '') : (customCity.trim() ? customCity.trim() : city);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!isPhoneValid) {
      setError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    if (!activeCity) {
      setError(city === 'Other' ? 'Please type your city or town name.' : 'Please select or specify your city.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let visitorId = '';
      try {
        visitorId = localStorage.getItem('cars21_visitor_id') || sessionStorage.getItem('cars21_visitor_id') || '';
        localStorage.setItem('cars21_city', activeCity);
        window.dispatchEvent(new CustomEvent('cars21:city-change', { detail: { city: activeCity } }));
      } catch {}

      const payload = {
        name: name.trim(),
        phone: cleanDigits,
        city: activeCity,
        source: 'entrance_or_buy_modal',
        visitorId: visitorId || undefined
      };

      const response = await fetch('/api/buy-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Unable to submit your details. Please try again.');
      }

      onSuccess?.(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function stopEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') event.stopPropagation();
  }

  if (!open) return null;

  return (
    <div 
      className="lead-modal-backdrop" 
      onMouseDown={event => { 
        if (event.target === event.currentTarget) onClose(); 
      }}
    >
      <section
        ref={dialogRef}
        className="lead-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-car-lead-title"
        aria-describedby="buy-car-lead-description"
        onKeyDown={stopEscape}
      >
        {/* Top Gradient Stripe */}
        <div className="lead-modal-top-accent" />

        {/* Circular Close Button */}
        <button 
          ref={closeRef} 
          type="button" 
          className="lead-modal-close-btn" 
          aria-label="Close dialog" 
          onClick={onClose}
        >
          <X size={17} />
        </button>

        <div className="lead-modal-body">
          {/* Header Row */}
          <div className="lead-modal-badge-row">
            <span className="lead-modal-badge">
              <Sparkles size={12} /> CARS21 CERTIFIED HUB
            </span>
          </div>

          <h2 id="buy-car-lead-title" className="lead-modal-title">
            Unlock Verified Cars &amp; Best Prices
          </h2>
          <p id="buy-car-lead-description" className="lead-modal-subtitle">
            Enter your details to view certified 140-point diagnostics, unlock wholesale dealer pricing, and receive instant price drop alerts.
          </p>

          {/* Value Assurance Strip */}
          <div className="lead-assurance-strip">
            <span className="lead-assurance-item">
              <CheckCircle2 size={14} /> 140+ Points Inspected
            </span>
            <span className="lead-assurance-item">
              <CheckCircle2 size={14} /> Direct Dealer Pricing
            </span>
            <span className="lead-assurance-item">
              <CheckCircle2 size={14} /> 100% Free Service
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lead-form">
            {/* 1. Full Name Field */}
            <div className="lead-field-group">
              <label className="lead-field-label" htmlFor="lead-name">
                <span>Full Name <strong className="lead-required-star">*</strong></span>
              </label>
              <div className="lead-input-box">
                <span className="lead-input-icon"><User size={17} /></span>
                <input
                  id="lead-name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={80}
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="lead-input-element"
                />
              </div>
            </div>

            {/* 2. Mobile Number Field */}
            <div className="lead-field-group">
              <label className="lead-field-label" htmlFor="lead-phone">
                <span>Mobile Number <strong className="lead-required-star">*</strong></span>
                <span className="lead-whatsapp-tag">
                  <MessageSquareText size={11} /> WhatsApp Alerts
                </span>
              </label>
              <div className={`lead-input-box ${isPhoneValid ? 'valid' : ''}`}>
                <span className="lead-phone-prefix">
                  <span>🇮🇳</span> +91
                </span>
                <input
                  id="lead-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="lead-input-element"
                />
                {isPhoneValid && (
                  <CheckCircle2 size={18} className="lead-valid-check" />
                )}
              </div>
            </div>

            {/* 3. City Selection + Quick Metro Chips */}
            <div className="lead-field-group">
              <label className="lead-field-label" htmlFor="lead-city">
                <span>Your City / Hub <strong className="lead-required-star">*</strong></span>
                {activeCity && (
                  <span style={{ fontSize: '11px', color: '#ff5c00', fontWeight: 700 }}>
                    Selected: {activeCity}
                  </span>
                )}
              </label>
              <div className="lead-input-box">
                <span className="lead-input-icon"><MapPin size={17} /></span>
                <select
                  id="lead-city"
                  value={city}
                  onChange={e => {
                    setCity(e.target.value);
                    if (e.target.value !== 'Other') setCustomCity('');
                  }}
                  className="lead-input-element"
                  style={{ cursor: 'pointer', appearance: 'auto' }}
                >
                  {allCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Other Custom City Input Box */}
              {city === 'Other' && (
                <div className="lead-input-box" style={{ marginTop: '8px' }}>
                  <span className="lead-input-icon"><MapPin size={17} /></span>
                  <input
                    type="text"
                    required
                    placeholder="Type your town or city name"
                    value={customCity}
                    onChange={e => setCustomCity(e.target.value)}
                    className="lead-input-element"
                    autoFocus
                  />
                </div>
              )}

              {/* Quick 1-Click Metro Chips */}
              <div className="lead-city-chips-label">Popular Hubs (Tap to Select):</div>
              <div className="lead-city-chips-wrap">
                {popularMetros.slice(0, 10).map(m => {
                  const isSelected = activeCity.toLowerCase() === m.toLowerCase();
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`lead-city-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setCity(m);
                        setCustomCity('');
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="management-error" role="alert" style={{ margin: '4px 0 0', fontSize: '12px' }}>
                {error}
              </p>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              className="lead-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="wishlist-spinner" style={{ width: '16px', height: '16px', borderTopColor: '#ffffff' }} />
                  <span>Submitting Details…</span>
                </>
              ) : (
                <>
                  <span>Unlock Verified Cars &amp; Deals</span>
                  <ArrowRight size={17} className="submit-arrow" />
                </>
              )}
            </button>

            {/* Trust Footer */}
            <div className="lead-modal-footer">
              <ShieldCheck size={14} />
              <span>Zero spam promise. Never shared with unverified parties.</span>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
