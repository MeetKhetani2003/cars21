'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, MapPin, X, Check, Sparkles, Building2, Compass } from 'lucide-react';

export interface CityItem {
  id: string;
  name: string;
  state: string;
  popular?: boolean;
  code?: string;
  landmark?: string;
}

const DEFAULT_METROS: CityItem[] = [
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', popular: true, code: 'BLR', landmark: 'Vidhana Soudha' },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', popular: true, code: 'MUM', landmark: 'Gateway of India' },
  { id: 'delhi-ncr', name: 'Delhi NCR', state: 'Delhi', popular: true, code: 'DEL', landmark: 'India Gate' },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', popular: true, code: 'HYD', landmark: 'Charminar' },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', popular: true, code: 'PUN', landmark: 'Shaniwar Wada' },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', popular: true, code: 'CHN', landmark: 'Central Station' },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', popular: true, code: 'AMD', landmark: 'Sabarmati' },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', popular: true, code: 'KOL', landmark: 'Howrah Bridge' },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', popular: true, code: 'JAI', landmark: 'Hawa Mahal' },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Punjab', popular: false, code: 'IXC', landmark: 'Open Hand' },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', popular: false, code: 'COK', landmark: 'Marine Drive' },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', popular: false, code: 'LKO', landmark: 'Rumi Darwaza' },
  { id: 'surat', name: 'Surat', state: 'Gujarat', popular: false, code: 'STV', landmark: 'Diamond City' },
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', popular: false, code: 'IDR', landmark: 'Rajwada Palace' }
];

// Stylized visual icons for metro cities
function CityLandmarkIcon({ code }: { code?: string }) {
  switch (code) {
    case 'BLR':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#eff6ff" />
          <path d="M12 28V18L20 12L28 18V28H12Z" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
          <path d="M17 28V22H23V28" stroke="#2563eb" strokeWidth="2" />
          <circle cx="20" cy="17" r="1.5" fill="#2563eb" />
          <path d="M9 28H31" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'MUM':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#fef2f2" />
          <path d="M11 29V17H16V22C16 20 20 20 20 22C20 20 24 20 24 22V17H29V29" stroke="#dc2626" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 29H32" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 17L20 13L24 17" stroke="#dc2626" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'DEL':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#fff7ed" />
          <path d="M12 29V15L15 13H25L28 15V29" stroke="#ea580c" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 29V20C16 18 24 18 24 20V29" stroke="#ea580c" strokeWidth="2" />
          <path d="M9 29H31" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'HYD':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#faf5ff" />
          <path d="M12 29V13M12 13L10 16M12 13L14 16" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 29V13M28 13L26 16M28 13L30 16" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 18H28" stroke="#9333ea" strokeWidth="2" />
          <path d="M16 29V22C16 20 24 20 24 22V29" stroke="#9333ea" strokeWidth="2" />
          <circle cx="20" cy="15" r="1.5" fill="#9333ea" />
        </svg>
      );
    case 'PUN':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#f0fdf4" />
          <path d="M11 28V18L20 13L29 18V28" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 28V21C16 20 24 20 24 21V28" stroke="#16a34a" strokeWidth="2" />
          <path d="M10 28H30" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'CHN':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#ecfeff" />
          <path d="M12 28V16L20 12L28 16V28H12Z" stroke="#0891b2" strokeWidth="2" strokeLinejoin="round" />
          <path d="M17 28V20H23V28" stroke="#0891b2" strokeWidth="2" />
          <path d="M9 28H31" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'AMD':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#fffbeb" />
          <path d="M20 10L30 20L20 30L10 20L20 10Z" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="20" cy="20" r="2" fill="#d97706" />
        </svg>
      );
    case 'KOL':
      return (
        <svg viewBox="0 0 40 40" className="city-svg-icon" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#fdf2f8" />
          <path d="M8 26C14 20 26 20 32 26" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 28V22M20 28V20M28 28V22" stroke="#db2777" strokeWidth="2" />
          <path d="M8 28H32" stroke="#db2777" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <div className="city-code-avatar">
          {code || 'IN'}
        </div>
      );
  }
}

export interface CitySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  onSelectCity: (city: string) => void;
}

export function CitySelectModal({ isOpen, onClose, currentCity, onSelectCity }: CitySelectModalProps) {
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CityItem[]>(DEFAULT_METROS);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all listed cities dynamically from API
  useEffect(() => {
    let alive = true;
    const METRO_INFO: Record<string, { code: string; landmark: string }> = {
      'bengaluru': { code: 'BLR', landmark: 'Vidhana Soudha' },
      'mumbai': { code: 'MUM', landmark: 'Gateway of India' },
      'delhi ncr': { code: 'DEL', landmark: 'India Gate' },
      'hyderabad': { code: 'HYD', landmark: 'Charminar' },
      'pune': { code: 'PUN', landmark: 'Shaniwar Wada' },
      'chennai': { code: 'CHN', landmark: 'Central Station' },
      'ahmedabad': { code: 'AMD', landmark: 'Sabarmati' },
      'kolkata': { code: 'KOL', landmark: 'Howrah Bridge' },
      'jaipur': { code: 'JAI', landmark: 'Hawa Mahal' },
      'chandigarh': { code: 'IXC', landmark: 'Open Hand' },
      'kochi': { code: 'COK', landmark: 'Marine Drive' },
      'lucknow': { code: 'LKO', landmark: 'Rumi Darwaza' },
      'surat': { code: 'STV', landmark: 'Diamond City' },
      'indore': { code: 'IDR', landmark: 'Rajwada Palace' }
    };

    async function loadCities() {
      try {
        setLoading(true);
        // Try admin/cities first for comprehensive details
        const res = await fetch('/api/admin/cities');
        if (res.ok) {
          const data = await res.json();
          if (alive && Array.isArray(data.cities) && data.cities.length > 0) {
            const mapped: CityItem[] = data.cities
              .filter((c: any) => c.status !== 'inactive')
              .map((c: any) => {
                const normKey = c.name.toLowerCase().trim();
                const info = METRO_INFO[normKey];
                return {
                  id: c.id || normKey.replace(/[^a-z0-9]+/g, '-'),
                  name: c.name,
                  state: c.state || '',
                  popular: Boolean(c.popular),
                  code: info?.code || c.name.slice(0, 3).toUpperCase(),
                  landmark: info?.landmark || c.state || 'Metro'
                };
              });
            setCities(mapped);
            return;
          }
        }

        // Fallback to cars filters
        const filtersRes = await fetch('/api/cars/filters');
        if (filtersRes.ok) {
          const fData = await filtersRes.json();
          if (alive && Array.isArray(fData.cities) && fData.cities.length > 0) {
            const popularSet = new Set(fData.popularCities || []);
            const mapped: CityItem[] = fData.cities.map((name: string) => {
              const normKey = name.toLowerCase().trim();
              const info = METRO_INFO[normKey];
              return {
                id: normKey.replace(/[^a-z0-9]+/g, '-'),
                name,
                state: 'India',
                popular: popularSet.has(name) || ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai'].includes(name),
                code: info?.code || name.slice(0, 3).toUpperCase(),
                landmark: info?.landmark || 'India'
              };
            });
            setCities(mapped);
          }
        }
      } catch {
        // Keep default metros on error
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (isOpen) {
      loadCities();
    }
    return () => {
      alive = false;
    };
  }, [isOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Filtered lists
  const { popularList, otherList } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? cities.filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q)))
      : cities;

    const popular = filtered.filter(c => c.popular);
    const others = filtered.filter(c => !c.popular);

    return { popularList: popular, otherList: others };
  }, [cities, query]);

  if (!isOpen) return null;

  const handleSelect = (cityName: string) => {
    onSelectCity(cityName);
    onClose();
  };

  const isCurrent = (cityName: string) => {
    return currentCity.toLowerCase().trim() === cityName.toLowerCase().trim();
  };

  return (
    <div className="city-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="city-modal-container" role="dialog" aria-modal="true" aria-labelledby="city-modal-title">
        {/* Header */}
        <div className="city-modal-header">
          <div className="city-modal-title-group">
            <span className="city-modal-eyebrow">
              <Compass size={13} /> SELECT YOUR LOCATION
            </span>
            <h2 id="city-modal-title">Where are you looking for cars?</h2>
            <p>Find verified vehicles, doorstep inspections, and dealer inventory near you</p>
          </div>
          <button type="button" className="city-modal-close-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Live Search Input */}
        <div className="city-modal-search-wrap">
          <Search size={18} className="city-modal-search-icon" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city (e.g. Hyderabad, Mumbai, Ahmedabad, Pune)..."
            aria-label="Search city"
            className="city-modal-search-input"
          />
          {query && (
            <button type="button" className="city-modal-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Modal Scroll Content */}
        <div className="city-modal-content">
          {/* Quick All India option */}
          <div className="city-all-india-banner" onClick={() => handleSelect('All Cities')}>
            <div className="city-all-india-icon">
              <Building2 size={18} />
            </div>
            <div className="city-all-india-text">
              <b>All Cities / Pan-India</b>
              <span>Explore all verified cars listed across all dealerships and states</span>
            </div>
            {isCurrent('All Cities') || isCurrent('') ? (
              <span className="city-active-badge">
                <Check size={14} /> Selected
              </span>
            ) : (
              <span className="city-choose-link">Choose</span>
            )}
          </div>

          {/* Featured / Popular Metros Section */}
          {popularList.length > 0 && (
            <div className="city-section-block">
              <div className="city-section-head">
                <span className="city-section-title">
                  <Sparkles size={14} className="city-sparkle-icon" /> POPULAR METROS
                </span>
                <span className="city-section-count">{popularList.length} cities</span>
              </div>
              <div className="city-metro-grid">
                {popularList.map(city => {
                  const active = isCurrent(city.name);
                  return (
                    <button
                      key={city.id}
                      type="button"
                      className={`city-metro-card ${active ? 'is-active' : ''}`}
                      onClick={() => handleSelect(city.name)}
                    >
                      <CityLandmarkIcon code={city.code} />
                      <div className="city-metro-info">
                        <span className="city-metro-name">{city.name}</span>
                        {city.state && <span className="city-metro-state">{city.state}</span>}
                      </div>
                      {active && (
                        <span className="city-metro-check" aria-hidden="true">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Other Listed Cities */}
          {otherList.length > 0 && (
            <div className="city-section-block">
              <div className="city-section-head">
                <span className="city-section-title">
                  <MapPin size={14} /> ALL LISTED CITIES
                </span>
                <span className="city-section-count">{otherList.length} cities</span>
              </div>
              <div className="city-list-grid">
                {otherList.map(city => {
                  const active = isCurrent(city.name);
                  return (
                    <button
                      key={city.id}
                      type="button"
                      className={`city-list-item ${active ? 'is-active' : ''}`}
                      onClick={() => handleSelect(city.name)}
                    >
                      <span className="city-item-dot" />
                      <span className="city-item-name">{city.name}</span>
                      {city.state && <span className="city-item-state">({city.state})</span>}
                      {active && <Check size={14} className="city-item-check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty search state */}
          {popularList.length === 0 && otherList.length === 0 && (
            <div className="city-modal-empty">
              <MapPin size={32} />
              <b>No cities found matching &quot;{query}&quot;</b>
              <p>We are constantly expanding our partner dealership network across India.</p>
              <button type="button" className="city-clear-btn" onClick={() => setQuery('')}>
                View all cities
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="city-modal-footer">
          <span className="city-footer-note">
            <MapPin size={14} /> Showing certified inventory available for test drives in the chosen city.
          </span>
          <button type="button" className="city-footer-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
