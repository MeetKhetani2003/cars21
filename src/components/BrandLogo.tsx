'use client';

/**
 * Crisp inline vector brand emblems for all car companies in the marketplace.
 * Zero external CDN dependencies so logos render reliably offline and on Retina screens.
 */

export type BrandCatalogItem = {
  make: string;
  code: string;
  country?: string;
  count?: number;
};

export const DEFAULT_BRAND_CATALOG: BrandCatalogItem[] = [
  { make: 'Maruti Suzuki', code: 'MS', country: 'India / Japan' },
  { make: 'Hyundai', code: 'HY', country: 'South Korea' },
  { make: 'Tata', code: 'TA', country: 'India' },
  { make: 'Mahindra', code: 'MH', country: 'India' },
  { make: 'Toyota', code: 'TY', country: 'Japan' },
  { make: 'Honda', code: 'HO', country: 'Japan' },
  { make: 'Kia', code: 'KA', country: 'South Korea' },
  { make: 'Volkswagen', code: 'VW', country: 'Germany' },
  { make: 'Skoda', code: 'SK', country: 'Czech Republic' },
  { make: 'MG', code: 'MG', country: 'UK' },
  { make: 'Renault', code: 'RN', country: 'France' },
  { make: 'Nissan', code: 'NS', country: 'Japan' },
  { make: 'BMW', code: 'BMW', country: 'Germany' },
  { make: 'Mercedes-Benz', code: 'MB', country: 'Germany' },
  { make: 'Audi', code: 'AD', country: 'Germany' },
  { make: 'Jeep', code: 'JP', country: 'USA' },
  { make: 'Volvo', code: 'VO', country: 'Sweden' },
];

export function BrandLogo({ make, code }: { make: string; code?: string }) {
  const key = make.trim().toLowerCase();

  if (key.includes('maruti') || key.includes('suzuki')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <path
          d="M34.5 11.2L22 4l-9.5 6.4 13.6 7.8-13.6 8.3 2.5 1.5L27.5 21 15 13.7l10.2-5.9 7.8 4.5-3.2 2 4.7-3.1zm-21 25.6L26 44l9.5-6.4-13.6-7.8 13.6-8.3-2.5-1.5L20.5 27l12.5 7.3-10.2 5.9-7.8-4.5 3.2-2-4.7 3.1z"
          fill="#E11D48"
        />
      </svg>
    );
  }

  if (key.includes('hyundai')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#002C5F" strokeWidth="3.2" />
        <path
          d="M14.5 31.5L19 16.5h3.4l-2 6.6h8.2l2.1-6.6h3.4l-4.5 15h-3.4l2.1-7h-8.2l-2.2 7h-3.4z"
          fill="#002C5F"
        />
      </svg>
    );
  }

  if (key.includes('tata')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <ellipse cx="24" cy="24" rx="20" ry="13.5" fill="none" stroke="#1D4ED8" strokeWidth="3.2" />
        <path
          d="M12.5 19.5c4-2.8 19-2.8 23 0l-1.8 2.4c-3.1-1.3-6.5-1.6-7.8-1.6v14.2h-3.8V20.3c-1.3 0-4.7.3-7.8 1.6l-1.8-2.4z"
          fill="#1D4ED8"
        />
      </svg>
    );
  }

  if (key.includes('mahindra')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <path
          d="M6 34L13.5 13l10.5 8.5L34.5 13 42 34h-4.6l-4.9-14.2L24 27l-8.5-7.2L10.6 34H6z"
          fill="#C8102E"
        />
        <path d="M18.5 34l5.5-5.5 5.5 5.5h-11z" fill="#1E293B" />
      </svg>
    );
  }

  if (key.includes('toyota')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <ellipse cx="24" cy="24" rx="19.5" ry="13.5" fill="none" stroke="#DC2626" strokeWidth="2.8" />
        <ellipse cx="24" cy="18" rx="11.5" ry="5" fill="none" stroke="#DC2626" strokeWidth="2.4" />
        <ellipse cx="24" cy="24" rx="5.2" ry="12.5" fill="none" stroke="#DC2626" strokeWidth="2.4" />
      </svg>
    );
  }

  if (key.includes('honda')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <rect x="7" y="8" width="34" height="32" rx="8" fill="none" stroke="#334155" strokeWidth="2.8" />
        <path
          d="M14.5 13h3.6l1.7 10.5h8.4L29.9 13h3.6l-1.8 22h-3.4l.8-8h-10.2l.8 8h-3.4l-1.8-22z"
          fill="#334155"
        />
      </svg>
    );
  }

  if (key === 'kia' || key.includes('kia ')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <path
          d="M6 17h3.5v7.5L17 17h4.5l-7.2 7.2L21 31h-4.5l-5-5.5L9.5 27.5V31H6V17zm17.5 0H27v14h-3.5V17zm6.8 14L35.2 17h3.8L43 31h-3.6l-1-3.8-3.8 3.8h-4.3zm6.6-10.5l-2.6 6.2h4.2l-1.6-6.2z"
          fill="#0F172A"
        />
      </svg>
    );
  }

  if (key.includes('volkswagen') || key === 'vw') {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" stroke="#1E3A8A" strokeWidth="3.2" />
        <path
          d="M13 13.5l7.8 16.2 3.2-6.7 3.2 6.7L35 13.5M16.5 11.5L24 26l7.5-14.5M14.5 22.5l4.8 10.5L24 23l4.7 10 4.8-10.5"
          fill="none"
          stroke="#1E3A8A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (key.includes('skoda')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <circle cx="24" cy="24" r="18.5" fill="none" stroke="#15803D" strokeWidth="3" />
        <path
          d="M13 27c2-7.5 9-12 18.5-11l3-3.5-2 6.5c2 1.8 2.8 4.2 2.2 6.5-4.5-2.2-11.5-2.2-16 1l2.8 2.5H13z"
          fill="#15803D"
        />
      </svg>
    );
  }

  if (key === 'mg' || key.includes('morris')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <polygon
          points="16,6 32,6 42,16 42,32 32,42 16,42 6,32 6,16"
          fill="none"
          stroke="#B91C1C"
          strokeWidth="3"
        />
        <text
          x="24"
          y="29"
          textAnchor="middle"
          fontSize="14.5"
          fontWeight="900"
          fontFamily="Inter, sans-serif"
          fill="#B91C1C"
        >
          MG
        </text>
      </svg>
    );
  }

  if (key.includes('renault')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <path d="M24 6l12 18-12 18-12-18L24 6z" fill="none" stroke="#CA8A04" strokeWidth="3.2" />
        <path d="M24 12.5L31.5 24 24 35.5 16.5 24 24 12.5z" fill="none" stroke="#0F172A" strokeWidth="2.4" />
      </svg>
    );
  }

  if (key.includes('nissan')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <path d="M10 17a16 16 0 0 1 28 0M38 31a16 16 0 0 1-28 0" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <rect x="6" y="20" width="36" height="8" rx="2" fill="#0F172A" />
        <text x="24" y="26.2" textAnchor="middle" fontSize="6.8" fontWeight="800" fill="#ffffff" letterSpacing="1.2">
          NISSAN
        </text>
      </svg>
    );
  }

  if (key.includes('bmw')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="#0F172A" stroke="#334155" strokeWidth="2" />
        <circle cx="24" cy="24" r="12.5" fill="#ffffff" />
        <path d="M24 11.5A12.5 12.5 0 0 0 11.5 24H24V11.5z" fill="#0EA5E9" />
        <path d="M24 36.5A12.5 12.5 0 0 0 36.5 24H24v12.5z" fill="#0EA5E9" />
        <circle cx="24" cy="24" r="12.5" fill="none" stroke="#0F172A" strokeWidth="1.5" />
      </svg>
    );
  }

  if (key.includes('mercedes')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" stroke="#334155" strokeWidth="2.8" />
        <path
          d="M24 6v18m0 0L9.5 34.5M24 24l14.5 10.5"
          stroke="#334155"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (key.includes('audi')) {
    return (
      <svg viewBox="0 0 64 32" className="brand-svg-emblem brand-svg-wide" aria-hidden="true">
        <circle cx="14" cy="16" r="8.5" fill="none" stroke="#0F172A" strokeWidth="2.4" />
        <circle cx="26" cy="16" r="8.5" fill="none" stroke="#0F172A" strokeWidth="2.4" />
        <circle cx="38" cy="16" r="8.5" fill="none" stroke="#0F172A" strokeWidth="2.4" />
        <circle cx="50" cy="16" r="8.5" fill="none" stroke="#0F172A" strokeWidth="2.4" />
      </svg>
    );
  }

  if (key.includes('jeep')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <rect x="6" y="13" width="36" height="22" rx="6" fill="#1E293B" />
        <circle cx="11.5" cy="24" r="3" fill="#ffffff" />
        <circle cx="36.5" cy="24" r="3" fill="#ffffff" />
        <g fill="#ffffff">
          <rect x="16.5" y="17" width="2" height="14" rx="1" />
          <rect x="20" y="17" width="2" height="14" rx="1" />
          <rect x="23" y="17" width="2" height="14" rx="1" />
          <rect x="26" y="17" width="2" height="14" rx="1" />
          <rect x="29.5" y="17" width="2" height="14" rx="1" />
        </g>
      </svg>
    );
  }

  if (key.includes('volvo')) {
    return (
      <svg viewBox="0 0 48 48" className="brand-svg-emblem" aria-hidden="true">
        <circle cx="22" cy="26" r="14.5" fill="none" stroke="#1E3A8A" strokeWidth="3" />
        <path d="M32 16l9-9m0 0h-7m7 0v7" fill="none" stroke="#1E3A8A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="8.5" y="23" width="27" height="6" rx="1.5" fill="#1E3A8A" />
        <text x="22" y="27.6" textAnchor="middle" fontSize="5" fontWeight="900" fill="#ffffff" letterSpacing="0.8">
          VOLVO
        </text>
      </svg>
    );
  }

  const label = (code || make.slice(0, 2)).toUpperCase().slice(0, 3);
  return <span className="brand-fallback-code">{label}</span>;
}
