'use client';

import { useState, useMemo, useEffect, useRef, type CSSProperties } from 'react';
import {
  Sparkles, ShieldCheck, ArrowRight, CheckCircle2,
  Lock, UserRound, Zap
} from 'lucide-react';
import { calcEmi, formatINR, formatShort } from '../data';
import { useBuyerExperience } from './BuyerExperienceProvider';
import { Link } from '../lib/navigation';

const PRICE_PRESETS = [500000, 850000, 1200000, 1800000, 2500000];
const TENURE_OPTIONS = [
  { months: 12, yr: '1 Yr', mo: '12m' },
  { months: 24, yr: '2 Yrs', mo: '24m' },
  { months: 36, yr: '3 Yrs', mo: '36m' },
  { months: 48, yr: '4 Yrs', mo: '48m' },
  { months: 60, yr: '5 Yrs', mo: '60m' },
  { months: 72, yr: '6 Yrs', mo: '72m' },
  { months: 84, yr: '7 Yrs', mo: '84m' },
];

export function HomeEmiCalculator() {
  const { buyer, openLoginModal } = useBuyerExperience();
  const [carPrice, setCarPrice] = useState(850000);
  const [downPayment, setDownPayment] = useState(170000); // 20%
  const [tenureMonths, setTenureMonths] = useState(60);
  const [interestRate, setInterestRate] = useState(10.5);
  const [recordedStatus, setRecordedStatus] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const downMax = Math.max(10000, Math.round(carPrice * 0.5));
  const safeDownPayment = Math.min(downPayment, downMax);

  // Derived financial computations
  const loanAmount = Math.max(0, carPrice - safeDownPayment);
  const monthlyEmi = useMemo(() => {
    return Math.round(calcEmi(loanAmount, interestRate, tenureMonths));
  }, [loanAmount, interestRate, tenureMonths]);

  const totalPayment = monthlyEmi * tenureMonths;
  const totalInterest = Math.max(0, totalPayment - loanAmount);
  const principalPercent = totalPayment > 0 ? Math.round((loanAmount / totalPayment) * 100) : 100;
  const interestPercent = 100 - principalPercent;
  const downPaymentPercent = carPrice > 0 ? Math.round((safeDownPayment / carPrice) * 100) : 0;

  // Dynamic slider track fill percentages
  const priceFillPct = Math.min(100, Math.max(0, ((carPrice - 100000) / (5000000 - 100000)) * 100));
  const downFillPct = Math.min(100, Math.max(0, (safeDownPayment / downMax) * 100));
  const rateFillPct = Math.min(100, Math.max(0, ((interestRate - 8.5) / (15.0 - 8.5)) * 100));

  // Donut SVG geometry
  const ringRadius = 32;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const principalArc = (principalPercent / 100) * ringCircumference;

  // Record user action when buyer interacts with calculator
  useEffect(() => {
    if (!buyer) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setRecordedStatus('saving');
        const response = await fetch('/api/user/actions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'emi_calculate',
            carPrice,
            downPayment: safeDownPayment,
            loanAmount,
            tenureMonths,
            interestRate,
            monthlyEmi,
            label: `EMI calculation: ₹${monthlyEmi.toLocaleString('en-IN')}/mo on ₹${loanAmount.toLocaleString('en-IN')} loan (${tenureMonths}m @ ${interestRate}%)`
          })
        });
        if (response.ok) {
          setRecordedStatus('saved');
        } else {
          setRecordedStatus(null);
        }
      } catch {
        setRecordedStatus(null);
      }
    }, 900);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [buyer, carPrice, safeDownPayment, loanAmount, tenureMonths, interestRate, monthlyEmi]);

  // Handlers
  const handlePriceChange = (newPrice: number) => {
    setCarPrice(newPrice);
    setDownPayment(Math.round((newPrice * 0.2) / 10000) * 10000);
  };

  const handleDownPaymentPercent = (percent: number) => {
    const amount = Math.round((carPrice * (percent / 100)) / 10000) * 10000;
    setDownPayment(amount);
  };

  const handleGateAction = () => {
    if (!buyer) {
      openLoginModal('/#emi-calculator');
    }
  };

  return (
    <section id="emi-calculator" className="home-emi-section">
      <div className="container">
        {/* Section Header */}
        <div className="emi-section-header">
          <div className="emi-eyebrow-pill">
            <Sparkles size={13} />
            <span>SMART AUTO FINANCING</span>
          </div>
          <h2 className="emi-section-title">Tailor Your Monthly Payment</h2>
          <p className="emi-section-sub">
            Slide to calibrate your vehicle budget, down payment, and tenure for an instant breakdown from 12+ partner banks.
          </p>
        </div>

        {/* Main 2-Column Calculator Bento */}
        <div className="emi-bento-grid">
          {/* Left Column: Precision Sliders & Controls */}
          <div className="emi-controls-card">
            {/* 1. Vehicle Price Slider */}
            <div className="calculator-group">
              <div className="calc-group-header">
                <div>
                  <span className="calc-field-name">Vehicle Budget</span>
                  <small className="calc-sub-note">On-road / listed price</small>
                </div>
                <span className="calc-value-bubble">{formatINR(carPrice)}</span>
              </div>
              <input
                type="range"
                min={100000}
                max={5000000}
                step={25000}
                value={carPrice}
                onChange={e => handlePriceChange(Number(e.target.value))}
                className="emi-slider-input"
                style={{ '--slider-pct': `${priceFillPct}%` } as CSSProperties}
                aria-label="Car price"
              />
              <div className="calc-range-extents">
                <small>₹1 Lakh</small>
                <small>₹50 Lakh</small>
              </div>
              <div className="calc-quick-chips">
                {PRICE_PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`calc-chip-btn ${carPrice === p ? 'active' : ''}`}
                    onClick={() => handlePriceChange(p)}
                  >
                    {formatShort(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Down Payment Slider */}
            <div className="calculator-group">
              <div className="calc-group-header">
                <div>
                  <span className="calc-field-name">Down Payment</span>
                  <small className="calc-sub-note">{downPaymentPercent}% upfront</small>
                </div>
                <span className="calc-value-bubble">{formatINR(safeDownPayment)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={downMax}
                step={10000}
                value={safeDownPayment}
                onChange={e => setDownPayment(Number(e.target.value))}
                className="emi-slider-input"
                style={{ '--slider-pct': `${downFillPct}%` } as CSSProperties}
                aria-label="Down payment"
              />
              <div className="calc-range-extents">
                <small>₹0 (Zero Down)</small>
                <small>{formatShort(downMax)} (50%)</small>
              </div>
              <div className="calc-quick-chips">
                <button
                  type="button"
                  className={`calc-chip-btn zero-down-chip ${safeDownPayment === 0 ? 'active' : ''}`}
                  onClick={() => setDownPayment(0)}
                >
                  <Zap size={12} /> Zero Down
                </button>
                {[10, 20, 30, 40].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    className={`calc-chip-btn ${downPaymentPercent === pct ? 'active' : ''}`}
                    onClick={() => handleDownPaymentPercent(pct)}
                  >
                    {pct}% Down
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Loan Tenure Segmented Matrix */}
            <div className="calculator-group">
              <div className="calc-group-header">
                <div>
                  <span className="calc-field-name">Loan Tenure</span>
                  <small className="calc-sub-note">Flexible repayment duration</small>
                </div>
                <span className="calc-value-bubble">{tenureMonths} Months</span>
              </div>
              <div className="tenure-pills-row" role="radiogroup" aria-label="Loan tenure">
                {TENURE_OPTIONS.map(opt => (
                  <button
                    key={opt.months}
                    type="button"
                    role="radio"
                    aria-checked={tenureMonths === opt.months}
                    className={`tenure-pill-btn ${tenureMonths === opt.months ? 'active' : ''}`}
                    onClick={() => setTenureMonths(opt.months)}
                  >
                    <strong>{opt.yr}</strong>
                    <small>{opt.mo}</small>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Interest Rate Slider */}
            <div className="calculator-group">
              <div className="calc-group-header">
                <div>
                  <span className="calc-field-name">Interest Rate (p.a.)</span>
                  <small className="calc-sub-note">Partner bank starting ROI</small>
                </div>
                <span className="calc-value-bubble rate-bubble">{interestRate.toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min={8.5}
                max={15.0}
                step={0.25}
                value={interestRate}
                onChange={e => setInterestRate(Number(e.target.value))}
                className="emi-slider-input slider-accent-orange"
                style={{ '--slider-pct': `${rateFillPct}%` } as CSSProperties}
                aria-label="Interest rate"
              />
              <div className="calc-range-extents">
                <small>8.50% Prime</small>
                <small>15.00% Max</small>
              </div>
            </div>
          </div>

          {/* Right Column: Obsidian Glass Financial Summary Card */}
          <div className="emi-result-card">
            <div className="emi-result-glow" aria-hidden="true" />

            {/* Top Spotlight: Monthly EMI + Live Ring Donut */}
            <div className="emi-spotlight-box">
              <div className="emi-spotlight-main">
                <span className="spotlight-tag">
                  <ShieldCheck size={12} /> ESTIMATED MONTHLY EMI
                </span>
                <div className="spotlight-figure-row">
                  <span className="spotlight-amount">{formatINR(monthlyEmi)}</span>
                  <span className="spotlight-term">/ mo</span>
                </div>
                <p className="spotlight-subtext">
                  <b>{formatINR(loanAmount)}</b> loan · {tenureMonths} mos · {interestRate.toFixed(2)}% p.a.
                </p>
              </div>

              <div className="emi-donut-wrap" aria-label={`Principal ${principalPercent}% vs Interest ${interestPercent}%`}>
                <svg viewBox="0 0 80 80" className="emi-donut-svg">
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(251, 146, 60, 0.35)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${principalArc} ${ringCircumference}`}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dasharray 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                </svg>
                <div className="emi-donut-center">
                  <b>{principalPercent}%</b>
                  <small>Principal</small>
                </div>
              </div>
            </div>

            {/* Visual Two-Tone Ratio Bar */}
            <div className="emi-ratio-bar-wrap">
              <div className="ratio-bar">
                <div className="ratio-bar-principal" style={{ width: `${principalPercent}%` }} />
                <div className="ratio-bar-interest" style={{ width: `${interestPercent}%` }} />
              </div>
              <div className="ratio-bar-legend">
                <span className="legend-item principal">
                  <span className="legend-dot" /> Principal ({principalPercent}%)
                </span>
                <span className="legend-item interest">
                  <span className="legend-dot" /> Interest ({interestPercent}%)
                </span>
              </div>
            </div>

            {/* Frosted Glass Breakdown Rows */}
            <div className="emi-breakdown-table">
              <div className="breakdown-row">
                <span>Principal Loan Amount</span>
                <b>{formatINR(loanAmount)}</b>
              </div>
              <div className="breakdown-row">
                <span>Total Interest Payable</span>
                <b className="interest-figure">{formatINR(totalInterest)}</b>
              </div>
              <div className="breakdown-row total-row">
                <span>Total Amount Payable</span>
                <b className="total-amount-figure">{formatINR(totalPayment)}</b>
              </div>
            </div>

            {/* User Login Gating & Action CTA */}
            <div className="emi-action-box">
              {buyer ? (
                <div className="emi-auth-success-card">
                  <div className="auth-status-line">
                    <span className="auth-user-pill">
                      <span className="auth-avatar-mini"><UserRound size={12} /></span>
                      <span>Active: <b>{buyer.name}</b></span>
                    </span>
                    {recordedStatus === 'saved' && (
                      <span className="auth-recorded-badge">
                        <CheckCircle2 size={12} /> Saved
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/loans24/eligibility?amount=${loanAmount}&tenure=${tenureMonths}&rate=${interestRate}`}
                    className="button button-orange button-full emi-apply-btn"
                  >
                    Apply for Pre-Approved Sanction <ArrowRight size={16} />
                  </Link>
                  <Link
                    href={`/buy-cars?maxPrice=${carPrice}`}
                    className="emi-browse-cars-link"
                  >
                    Browse inspected cars under {formatShort(carPrice)} <ArrowRight size={13} />
                  </Link>
                </div>
              ) : (
                <div className="emi-login-gate-card">
                  <div className="emi-gate-row">
                    <div className="gate-icon-circle">
                      <Lock size={16} />
                    </div>
                    <div className="gate-copy">
                      <h4>Unlock Pre-Approved Bank Offers</h4>
                      <p>Instant CIBIL-safe credit check across 12+ leading lenders.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGateAction}
                    className="button button-primary button-full gate-login-btn"
                  >
                    Sign In to Unlock Custom Rates <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Bank Partners Trust Strip */}
            <div className="emi-bank-partners-strip">
              <span className="partners-caption">APPROVED LENDING PARTNERS</span>
              <div className="partners-badge-list">
                <span className="partner-name">HDFC Bank</span>
                <span className="partner-name">ICICI Bank</span>
                <span className="partner-name">SBI Auto</span>
                <span className="partner-name">Axis Bank</span>
                <span className="partner-name">Kotak</span>
                <span className="partner-name">IDFC First</span>
              </div>
            </div>

            {/* Quick Guarantees Strip */}
            <div className="emi-perks-row">
              <span>⚡ 10-Min Sanction</span>
              <span>📄 Digital KYC</span>
              <span>🛡️ Zero Foreclosure</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
