'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  IndianRupee, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, 
  Lock, UserRound, Zap, Clock, Banknote, Building2, HelpCircle 
} from 'lucide-react';
import { calcEmi, formatINR, formatShort } from '../data';
import { useBuyerExperience } from './BuyerExperienceProvider';
import { Link } from '../lib/navigation';

const PRICE_PRESETS = [500000, 850000, 1200000, 1800000, 2500000];
const TENURE_OPTIONS = [
  { months: 12, label: '12m (1 yr)' },
  { months: 24, label: '24m (2 yrs)' },
  { months: 36, label: '36m (3 yrs)' },
  { months: 48, label: '48m (4 yrs)' },
  { months: 60, label: '60m (5 yrs)' },
  { months: 72, label: '72m (6 yrs)' },
  { months: 84, label: '84m (7 yrs)' },
];

export function HomeEmiCalculator() {
  const { buyer, openLoginModal } = useBuyerExperience();
  const [carPrice, setCarPrice] = useState(850000);
  const [downPayment, setDownPayment] = useState(170000); // 20%
  const [tenureMonths, setTenureMonths] = useState(60);
  const [interestRate, setInterestRate] = useState(10.5);
  const [recordedStatus, setRecordedStatus] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived financial computations
  const loanAmount = Math.max(0, carPrice - downPayment);
  const monthlyEmi = useMemo(() => {
    return Math.round(calcEmi(loanAmount, interestRate, tenureMonths));
  }, [loanAmount, interestRate, tenureMonths]);

  const totalPayment = monthlyEmi * tenureMonths;
  const totalInterest = Math.max(0, totalPayment - loanAmount);
  const principalPercent = totalPayment > 0 ? Math.round((loanAmount / totalPayment) * 100) : 100;
  const interestPercent = 100 - principalPercent;
  const downPaymentPercent = carPrice > 0 ? Math.round((downPayment / carPrice) * 100) : 0;

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
            downPayment,
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
  }, [buyer, carPrice, downPayment, loanAmount, tenureMonths, interestRate, monthlyEmi]);

  // Handlers
  const handlePriceChange = (newPrice: number) => {
    setCarPrice(newPrice);
    // keep downpayment ratio proportional (20%)
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
            <Sparkles size={14} className="text-orange" />
            <span>CARS21 INSTANT CAR FINANCING</span>
          </div>
          <h2 className="emi-section-title">Smart Car Loan EMI Calculator</h2>
          <p className="emi-section-sub">
            Customize your loan amount, choose flexible tenure, and get pre-approved financing in under 10 minutes with zero paperwork.
          </p>
        </div>

        {/* Main 2-Column Calculator Bento */}
        <div className="emi-bento-grid">
          {/* Left Column: Sliders & Controls */}
          <div className="emi-controls-card">
            {/* 1. Vehicle Price Slider */}
            <div className="calculator-group">
              <div className="calc-group-header">
                <span className="calc-field-name">Target Car Price</span>
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
                aria-label="Car price"
              />
              <div className="calc-range-extents">
                <small>₹1.0 Lakh</small>
                <small>₹50.0 Lakh</small>
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
                  <small className="calc-sub-note">({downPaymentPercent}% of car value)</small>
                </div>
                <span className="calc-value-bubble">{formatINR(downPayment)}</span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={Math.round(carPrice * 0.5)} 
                step={10000} 
                value={downPayment} 
                onChange={e => setDownPayment(Number(e.target.value))}
                className="emi-slider-input"
                aria-label="Down payment"
              />
              <div className="calc-quick-chips">
                <button 
                  type="button" 
                  className={`calc-chip-btn zero-down-chip ${downPayment === 0 ? 'active' : ''}`}
                  onClick={() => setDownPayment(0)}
                >
                  <Zap size={12} /> Zero Down Payment
                </button>
                {[10, 20, 30].map(pct => (
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

            {/* 3. Loan Tenure Segmented Selector */}
            <div className="calculator-group">
              <div className="calc-group-header">
                <span className="calc-field-name">Loan Duration / Tenure</span>
                <span className="calc-value-bubble">{tenureMonths} Months ({tenureMonths / 12} Years)</span>
              </div>
              <div className="tenure-pills-row">
                {TENURE_OPTIONS.map(opt => (
                  <button 
                    key={opt.months} 
                    type="button" 
                    className={`tenure-pill-btn ${tenureMonths === opt.months ? 'active' : ''}`}
                    onClick={() => setTenureMonths(opt.months)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Interest Rate Slider */}
            <div className="calculator-group">
              <div className="calc-group-header">
                <div>
                  <span className="calc-field-name">Interest Rate (p.a.)</span>
                  <small className="calc-sub-note">Starting rate from partner banks</small>
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
                className="emi-slider-input"
                aria-label="Interest rate"
              />
              <div className="calc-range-extents">
                <small>8.50% (Prime)</small>
                <small>15.00%</small>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Breakdown & High-Converting Action Card */}
          <div className="emi-result-card">
            {/* Top Spotlight: Monthly EMI */}
            <div className="emi-spotlight-box">
              <span className="spotlight-tag">
                <ShieldCheck size={13} /> ESTIMATED MONTHLY INSTALLMENT
              </span>
              <div className="spotlight-figure-row">
                <span className="spotlight-amount">{formatINR(monthlyEmi)}</span>
                <span className="spotlight-term">/ month</span>
              </div>
              <p className="spotlight-subtext">
                For a net loan of <b>{formatINR(loanAmount)}</b> over {tenureMonths} months at {interestRate}% p.a.
              </p>
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
                  <span className="legend-dot" /> Total Interest ({interestPercent}%)
                </span>
              </div>
            </div>

            {/* Breakdown Metric Rows */}
            <div className="emi-breakdown-table">
              <div className="breakdown-row">
                <span>Principal Loan Amount</span>
                <b>{formatINR(loanAmount)}</b>
              </div>
              <div className="breakdown-row">
                <span>Total Interest Payable</span>
                <b>{formatINR(totalInterest)}</b>
              </div>
              <div className="breakdown-row total-row">
                <span>Total Amount Payable</span>
                <b className="total-amount-figure">{formatINR(totalPayment)}</b>
              </div>
            </div>

            {/* User Login Gating & Activity Tracking Feedback */}
            <div className="emi-action-box">
              {buyer ? (
                <div className="emi-auth-success-card">
                  <div className="auth-status-line">
                    <span className="auth-avatar-mini"><UserRound size={13} /></span>
                    <span className="auth-user-name">Active Session: <b>{buyer.name}</b></span>
                    {recordedStatus === 'saved' && (
                      <span className="auth-recorded-badge">
                        <CheckCircle2 size={12} /> Calculation Saved
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
                  <div className="gate-icon-circle">
                    <Lock size={18} />
                  </div>
                  <div className="gate-copy">
                    <h4>Sign in to check pre-approved loan eligibility</h4>
                    <p>Instant CIBIL-safe credit evaluation with real offers from 12+ partner banks.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleGateAction} 
                    className="button button-primary button-full gate-login-btn"
                  >
                    Sign In with Google to Unlock Rates <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Bank Partners Trust Strip */}
            <div className="emi-bank-partners-strip">
              <span className="partners-caption">TOP LENDING PARTNERS</span>
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
              <span>⚡ 10-Min In-Principle Sanction</span>
              <span>📄 100% Digital KYC</span>
              <span>🛡️ Zero Foreclosure Charges</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
