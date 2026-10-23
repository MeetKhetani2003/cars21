const fs = require('fs');
const path = require('path');

const cssPath = path.resolve('src/style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Replace legacy unimported font declarations
css = css.replace(/font-family:Manrope,sans-serif/g, "font-family:var(--font-heading)");
css = css.replace(/Manrope,Arial,sans-serif/g, "var(--font-heading)");
css = css.replace(/Manrope/g, "'Outfit', 'Plus Jakarta Sans', sans-serif");
css = css.replace(/'DM Sans'/g, "'Plus Jakarta Sans', sans-serif");

// 2. Enhance Google Fonts import at the top
const legacyImport = /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?[^']+'\);/;
const premiumGoogleFonts = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Space+Grotesk:wght@400;500;600;700&display=swap');`;

if (legacyImport.test(css)) {
  css = css.replace(legacyImport, premiumGoogleFonts);
} else {
  css = premiumGoogleFonts + '\n' + css;
}

// 3. Define the master Luxury Automotive Styling Layer to append
const luxuryStylingLayer = `

/* ==========================================================================
   PREMIER AUTOMOTIVE DESIGN SYSTEM (CARS24, SPINNY, PORSCHE, CRED GARAGE)
   Fonts, Luxury Color Schemes, Micro-Interactions, and Silky Animations
   ========================================================================== */

:root {
  /* Ultra-Premium Typefaces */
  --font-heading: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Space Grotesk', 'Outfit', monospace;

  /* Premier Automotive Color Palette */
  --ink: #090d16;
  --ink-2: #1e293b;
  --muted: #64748b;
  --line: #e2e8f0;
  --surface: #ffffff;
  --paper: #f8fafc;
  
  /* Brand Signatures */
  --blue: #2563eb;
  --blue-dark: #1d4ed8;
  --blue-glow: rgba(37, 99, 235, 0.28);
  --blue-subtle: #eff6ff;

  --orange: #f95738;
  --orange-dark: #ea580c;
  --orange-glow: rgba(249, 87, 56, 0.28);
  --orange-subtle: #fff7ed;

  --green: #10b981;
  --green-dark: #059669;
  --green-glow: rgba(16, 185, 129, 0.25);
  --green-subtle: #ecfdf5;

  --gold: #f59e0b;
  --gold-glow: rgba(245, 158, 11, 0.25);

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;

  --shadow-subtle: 0 4px 12px rgba(15, 23, 42, 0.03);
  --shadow-card: 0 10px 30px -10px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(15, 23, 42, 0.02);
  --shadow-hover: 0 24px 48px -12px rgba(15, 23, 42, 0.13), 0 8px 16px -4px rgba(15, 23, 42, 0.04);
  --shadow-floating: 0 30px 60px -15px rgba(15, 23, 42, 0.2);
}

/* 1. Global Typography Enforcement */
body, button, input, select, textarea {
  font-family: var(--font-body) !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6,
.wordmark,
.hero h1,
.section-title h2,
.car-name,
.car-price-row strong,
.detail-price,
.stat-metric-info b,
.valuation-number,
.emi-result h2,
.dealer-number,
.luxury-dealer-title {
  font-family: var(--font-heading) !important;
  letter-spacing: -0.035em !important;
  text-rendering: optimizeLegibility;
}

/* High Precision Tabular Numbers (Price, EMI, Speed, Inspection) */
.car-price-row strong,
.detail-price,
.spec-tile-item b,
.spec-row span,
.score-pill,
.score-ring,
.stat-metric-info b,
.valuation-number,
.emi-calculated-val,
.live-counter-pill {
  font-variant-numeric: tabular-nums !important;
  font-feature-settings: "tnum" 1, "cv05" 1 !important;
}

/* 2. Luminous Magnetic Button Sheen (Mobbin / Spinny / Porsche UX) */
.button {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  font-family: var(--font-heading) !important;
  font-weight: 700 !important;
  letter-spacing: -0.015em !important;
  border-radius: var(--radius-md) !important;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease !important;
}

.button::after {
  content: '';
  position: absolute;
  top: -60%;
  left: -80%;
  width: 60%;
  height: 220%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.24), transparent);
  transform: rotate(25deg);
  pointer-events: none;
  opacity: 0;
  transition: left 0.75s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.button:hover::after {
  left: 140%;
  opacity: 1;
}

.button:hover {
  transform: translateY(-2px) !important;
}

.button:active {
  transform: translateY(0) scale(0.985) !important;
}

.button-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  box-shadow: 0 10px 24px -4px var(--blue-glow), 0 2px 6px rgba(37, 99, 235, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}

.button-primary:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%) !important;
  box-shadow: 0 14px 30px -4px var(--blue-glow), 0 4px 10px rgba(37, 99, 235, 0.25) !important;
}

.button-vermillion,
.button-orange {
  background: linear-gradient(135deg, #f95738 0%, #ea580c 100%) !important;
  color: #fff !important;
  box-shadow: 0 10px 24px -4px var(--orange-glow) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
}

.button-vermillion:hover,
.button-orange:hover {
  background: linear-gradient(135deg, #ff6b4a 0%, #c2410c 100%) !important;
  box-shadow: 0 14px 32px -4px var(--orange-glow) !important;
}

.button-dark {
  background: #0f172a !important;
  color: #fff !important;
  box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.25) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.button-dark:hover {
  background: #1e293b !important;
  box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.35) !important;
}

/* 3. Luxury Automotive Cards & Hover Physics */
.car-card,
.luxury-dealer-card,
.superapp-item,
.benefit-card,
.intent-card,
.category-card,
.assurance-box,
.sticky-booking-hub-card,
.emi-controls-card,
.emi-result-card {
  background: #ffffff !important;
  border: 1px solid rgba(226, 232, 240, 0.85) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-card) !important;
  transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.38s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease !important;
}

.car-card:hover,
.luxury-dealer-card:hover,
.superapp-item:hover,
.intent-card:hover,
.category-card:hover {
  transform: translateY(-6px) !important;
  box-shadow: var(--shadow-hover), 0 0 0 1px rgba(37, 99, 235, 0.1) !important;
  border-color: #93c5fd !important;
}

/* 4. Cinematic Vehicle Image Zoom */
.car-photo {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: #0f172a;
}

.car-photo img,
.gallery-photo-card img,
.detail-main-photo img {
  transition: transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease !important;
  backface-visibility: hidden;
  will-change: transform;
}

.car-card:hover .car-photo img,
.gallery-photo-card:hover img {
  transform: scale(1.075) !important;
  filter: contrast(1.03) saturate(1.05) !important;
}

/* 5. Breathing Verification Badges & Pulse Aura */
@keyframes emeraldAuraPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

@keyframes sapphireAuraPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
  }
}

.verification-badge,
.score-pill,
.trust-chip-verified,
.status-badge {
  position: relative;
  border-radius: var(--radius-full) !important;
  font-weight: 700 !important;
  animation: emeraldAuraPulse 3.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

.status-dot,
.trust-badge-dot,
.status-live-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  background: #10b981 !important;
  box-shadow: 0 0 8px #10b981 !important;
  animation: statusDotBreathe 2s infinite ease-in-out !important;
}

/* 6. Dynamic Floating Vehicle in Studio Showcase */
@keyframes premierCarFloat {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-9px) rotate(-0.35deg);
  }
}

@keyframes groundGlowPulse {
  0%, 100% {
    opacity: 0.55;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 0.85;
    transform: translateX(-50%) scale(1.12);
  }
}

.floating-hero-car {
  animation: premierCarFloat 6.5s cubic-bezier(0.45, 0, 0.55, 1) infinite !important;
  filter: drop-shadow(0 28px 40px rgba(15, 23, 42, 0.22)) !important;
}

.hero-car-underglow {
  position: absolute;
  bottom: 5%;
  left: 50%;
  width: 75%;
  height: 35px;
  background: radial-gradient(ellipse at center, rgba(37, 99, 235, 0.35) 0%, rgba(249, 87, 56, 0.15) 45%, transparent 75%);
  border-radius: 50%;
  animation: groundGlowPulse 6.5s cubic-bezier(0.45, 0, 0.55, 1) infinite !important;
  pointer-events: none;
  filter: blur(12px);
}

/* 7. Interactive Sliders & Range Controls */
input[type="range"] {
  accent-color: #2563eb !important;
  height: 6px;
  border-radius: 999px;
  transition: all 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb {
  width: 22px !important;
  height: 22px !important;
  border-radius: 50% !important;
  background: #2563eb !important;
  border: 3px solid #ffffff !important;
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.55), 0 0 0 1px rgba(37, 99, 235, 0.3) !important;
  cursor: grab !important;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
}

input[type="range"]:active::-webkit-slider-thumb,
input[type="range"]:hover::-webkit-slider-thumb {
  transform: scale(1.22) !important;
  box-shadow: 0 4px 18px rgba(37, 99, 235, 0.75), 0 0 0 4px rgba(37, 99, 235, 0.18) !important;
  cursor: grabbing !important;
}

/* 8. Modern Glassmorphic Header & Nav */
.site-header {
  background: rgba(255, 255, 255, 0.88) !important;
  backdrop-filter: blur(24px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(190%) !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
}

.wordmark {
  font-family: var(--font-heading) !important;
  font-size: 23px !important;
  font-weight: 900 !important;
  letter-spacing: -0.04em !important;
  background: linear-gradient(135deg, #0f172a 60%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.wordmark span.logo-accent {
  background: linear-gradient(135deg, #f95738 0%, #ea580c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 9. High-Octane Quick Filter Presets & Chips */
.quick-brand-chip,
.filter-chip,
.preset-price-btn,
.tab-pill {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.quick-brand-chip:hover,
.filter-chip:hover,
.preset-price-btn:hover {
  transform: translateY(-2px) !important;
  border-color: #2563eb !important;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12) !important;
}

.preset-price-btn.active,
.quick-brand-chip.active {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  color: #fff !important;
  border-color: transparent !important;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3) !important;
}

/* 10. Shimmer Loading State */
@keyframes shimmerPulse {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmerPulse 1.8s infinite ease-in-out;
  border-radius: var(--radius-sm);
}

`;

css += luxuryStylingLayer;

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully updated style.css with Premier Automotive Fonts, Colors, and Animations.');
