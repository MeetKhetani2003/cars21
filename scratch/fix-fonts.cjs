const fs = require('fs');
const path = require('path');

const cssPath = path.resolve('src/style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Replace the Google Fonts import with Inter and Plus Jakarta Sans
const legacyImport = /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?[^']+'\);/;
const interGoogleFonts = `@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400;1,14..32,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;

if (legacyImport.test(css)) {
  css = css.replace(legacyImport, interGoogleFonts);
} else {
  css = interGoogleFonts + '\n' + css;
}

// 2. Fix broken font shorthands that cause browser fallback to Times New Roman
// Fix instances like 'Outfit', 'Plus Jakarta Sans', sans-serif,sans-serif
css = css.replace(/sans-serif,sans-serif/g, "sans-serif");

// Replace all Outfit and Space Grotesk references with Inter
css = css.replace(/'Outfit',\s*'Plus Jakarta Sans',\s*sans-serif/g, "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif");
css = css.replace(/'Outfit'/g, "'Inter'");
css = css.replace(/Outfit/g, "Inter");
css = css.replace(/'Space Grotesk'/g, "'Inter'");
css = css.replace(/Space Grotesk/g, "Inter");

// Fix any font: ... var(--font-heading) in shorthands which causes parsing failures in CSS
css = css.replace(/font:\s*([^;]+)\s+var\(--font-heading\)/g, "font: $1 'Inter', sans-serif");

// 3. Remove the previous appended section if present and replace with pristine Inter luxury typography
const marker = '/* ==========================================================================\n   PREMIER AUTOMOTIVE DESIGN SYSTEM (CARS24, SPINNY, PORSCHE, CRED GARAGE)';
if (css.indexOf(marker) !== -1) {
  css = css.substring(0, css.indexOf(marker));
}

const pristineTypographyLayer = `
/* ==========================================================================
   PREMIER AUTOMOTIVE DESIGN SYSTEM — INTER & PLUS JAKARTA SANS TYPOGRAPHY
   (Used by CARS24, Spinny, Porsche Digital, AutoTrader UK, Tesla)
   ========================================================================== */

:root {
  /* Pristine Automotive Font Stack */
  --font-sans: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-heading: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Enterprise Luxury Palette */
  --ink: #0a0f1d;
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
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-full: 9999px;

  --shadow-subtle: 0 4px 12px rgba(10, 15, 29, 0.03);
  --shadow-card: 0 10px 30px -10px rgba(10, 15, 29, 0.07), 0 2px 6px rgba(10, 15, 29, 0.02);
  --shadow-hover: 0 20px 40px -12px rgba(10, 15, 29, 0.12), 0 4px 12px rgba(10, 15, 29, 0.03);
}

/* Universal Typography Reset: Flawless, Crisp, Elegant */
*, *::before, *::after {
  font-family: var(--font-sans);
}

html, body {
  font-family: var(--font-sans) !important;
  color: var(--ink);
  background: #f8fafc;
  letter-spacing: -0.011em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

button, input, select, textarea {
  font-family: var(--font-sans) !important;
  letter-spacing: -0.01em;
}

/* Headings: Sharp, Clean, Authoritative */
h1, h2, h3, h4, h5, h6,
.wordmark,
.hero h1,
.section-title h2,
.car-name,
.stat-metric-info b,
.valuation-number,
.dealer-number,
.luxury-dealer-title {
  font-family: var(--font-heading) !important;
  font-weight: 700 !important;
  letter-spacing: -0.03em !important;
  color: var(--ink);
}

/* Pricing & Tabular Data (CARS24 / Spinny Style) */
.car-price-row strong,
.detail-price,
.spec-tile-item b,
.score-pill,
.score-ring,
.emi-calculated-val,
.stat-metric-info b {
  font-family: var(--font-heading) !important;
  font-weight: 800 !important;
  letter-spacing: -0.025em !important;
  font-variant-numeric: tabular-nums !important;
}

/* Buttons: Magnetic Hover & Premium Sheen */
.button {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  font-family: var(--font-heading) !important;
  font-weight: 600 !important;
  letter-spacing: -0.015em !important;
  border-radius: var(--radius-md) !important;
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease !important;
}

.button::after {
  content: '';
  position: absolute;
  top: -60%;
  left: -80%;
  width: 60%;
  height: 220%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent);
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

/* Cards & Hover Elevation */
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
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.32s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease !important;
}

.car-card:hover,
.luxury-dealer-card:hover,
.superapp-item:hover,
.intent-card:hover,
.category-card:hover {
  transform: translateY(-5px) !important;
  box-shadow: var(--shadow-hover), 0 0 0 1px rgba(37, 99, 235, 0.1) !important;
  border-color: #93c5fd !important;
}

/* Vehicle Image Hover Zoom */
.car-photo {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: #0f172a;
}

.car-photo img,
.gallery-photo-card img,
.detail-main-photo img {
  transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease !important;
  backface-visibility: hidden;
  will-change: transform;
}

.car-card:hover .car-photo img,
.gallery-photo-card:hover img {
  transform: scale(1.065) !important;
  filter: contrast(1.02) saturate(1.04) !important;
}

/* Breathing Verification Badges */
@keyframes emeraldAuraPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
  }
  70% {
    box-shadow: 0 0 0 7px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.verification-badge,
.score-pill,
.trust-chip-verified,
.status-badge {
  position: relative;
  border-radius: var(--radius-full) !important;
  font-weight: 600 !important;
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
}

/* Sliders */
input[type="range"] {
  accent-color: #2563eb !important;
  height: 6px;
  border-radius: 999px;
  transition: all 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb {
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  background: #2563eb !important;
  border: 3px solid #ffffff !important;
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.5) !important;
  cursor: grab !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

input[type="range"]:active::-webkit-slider-thumb,
input[type="range"]:hover::-webkit-slider-thumb {
  transform: scale(1.2) !important;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.7) !important;
  cursor: grabbing !important;
}

/* Frosted Glass Navbar */
.site-header {
  background: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
}

.wordmark {
  font-family: var(--font-heading) !important;
  font-size: 22px !important;
  font-weight: 800 !important;
  letter-spacing: -0.035em !important;
  color: var(--ink) !important;
}

.wordmark span.logo-accent {
  color: #2563eb !important;
}

`;

css += pristineTypographyLayer;

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully applied Inter & Plus Jakarta Sans typography overhaul.');
