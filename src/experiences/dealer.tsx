import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { Link } from '../lib/navigation';
import { 
  ArrowRight, 
  CarFront, 
  Check, 
  ChevronRight, 
  CircleHelp, 
  Clock3, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp,
  Trophy,
  Building2,
  Phone,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Flame,
  Award,
  Gavel,
  Search,
  X,
  Sliders,
  Filter
} from 'lucide-react';
import { PageHero } from '../components/shared';
import { formatINR } from '../data';
import type { AuctionRecord } from '@/app/api/auctions/route';

export function DealerPage() {
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/dealer-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, consent: values.consent === 'on' })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your request could not be sent.');
      setSent(true);
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your request could not be sent.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="DEALER PARTNERS"
        title="A more considered way to source cars."
        copy="Tell Cars21 about your dealership. Our team will review your application and follow up."
      />
      <section className="container dealer-layout">
        <div className="dealer-intro">
          <span className="dealer-number">21</span>
          <span className="eyebrow">CARS21 PARTNER NETWORK</span>
          <h2>Good inventory starts with good partners.</h2>
          <p>Share your dealership details to request access to the Cars21 partner network.</p>
          <div className="dealer-points">
            <div><Check/> Verified seller journey</div>
            <div><Check/> Structured inspection notes</div>
            <div><Check/> Dedicated dealer workspace</div>
          </div>
          <Link className="button button-dark" to="/dealer-auctions">
            Explore live auctions <ArrowRight size={16}/>
          </Link>
        </div>

        <form className="dealer-form" onSubmit={submit}>
          <div className="step-kicker"><span>01</span> PARTNER APPLICATION</div>
          <h3>Tell us about your dealership</h3>
          <label className="field-label">
            Contact name
            <input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your name"/>
          </label>
          <label className="field-label">
            Dealership name
            <input name="businessName" required minLength={2} maxLength={120} placeholder="e.g. Saurashtra Auto Hub"/>
          </label>
          <label className="field-label">
            Work email
            <input name="email" required type="email" maxLength={160} autoComplete="email" placeholder="you@dealership.in"/>
          </label>
          <label className="field-label">
            Phone number
            <input name="phone" required type="tel" minLength={10} maxLength={18} autoComplete="tel" placeholder="+91 98765 43210"/>
          </label>
          <label className="field-label">
            City (Default: Junagadh)
            <select name="city" defaultValue="Junagadh">
              <option value="Junagadh">Junagadh (HQ)</option>
              <option value="Rajkot">Rajkot</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Gondal">Gondal</option>
              <option value="Jetpur">Jetpur</option>
              <option value="Morbi">Morbi</option>
              <option value="Jamnagar">Jamnagar</option>
              <option value="Bhavnagar">Bhavnagar</option>
              <option value="Surat">Surat</option>
              <option value="Vadodara">Vadodara</option>
            </select>
          </label>
          <label className="check-consent">
            <input name="consent" type="checkbox" required/> I agree to share these details with Cars21 so the team can contact me about partnership.
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={saving}>
            {saving ? 'Sending…' : 'Send application'} <ArrowRight size={16}/>
          </button>
          {sent && <div className="inline-success"><Check size={15}/>Application sent. The Cars21 team will follow up.</div>}
          <p className="detail-disclosure">Your application is saved securely for the Cars21 team to review.</p>
        </form>
      </section>
    </>
  );
}

export function AuctionPage() {
  const [auctions, setAuctions] = useState<AuctionRecord[]>([]);
  const [completedAuctions, setCompletedAuctions] = useState<AuctionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'yard' | 'digital' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'ending' | 'bid-high' | 'bid-low' | 'score'>('ending');

  // Quick Bid Modal state
  const [quickBidAuction, setQuickBidAuction] = useState<AuctionRecord | null>(null);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidderName, setBidderName] = useState('Junagadh Prime Wheels');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidFeedback, setBidFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Lot Details Modal state
  const [detailAuction, setDetailAuction] = useState<AuctionRecord | null>(null);

  const [userRole, setUserRole] = useState<string>('');
  const [extendingTime, setExtendingTime] = useState(false);

  // Check user session for admin permissions
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => {
        if (d?.user?.role) setUserRole(d.user.role);
      })
      .catch(() => {});
  }, []);

  // Synchronous ticking timer for all cards
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load live auctions from backend
  const loadAuctions = async () => {
    try {
      const res = await fetch('/api/auctions', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        const liveAndUpcoming = (data.auctions || []).filter((a: AuctionRecord) => a.status === 'live' || a.status === 'upcoming');
        setAuctions(liveAndUpcoming);
        setCompletedAuctions(data.completed || []);
      }
    } catch (err) {
      console.error('Failed to load auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
    const interval = setInterval(loadAuctions, 12000);
    return () => clearInterval(interval);
  }, []);

  // Update quickBidAuction when auctions re-fetch
  useEffect(() => {
    if (quickBidAuction) {
      const updated = auctions.find(a => a.id === quickBidAuction.id);
      if (updated) setQuickBidAuction(updated);
    }
    if (detailAuction) {
      const updated = auctions.find(a => a.id === detailAuction.id);
      if (updated) setDetailAuction(updated);
    }
  }, [auctions]);

  // Timer helper calculation
  const getAuctionTimer = (endsAt: string, status: string) => {
    if (status === 'completed' || status === 'cancelled') {
      return { isClosed: true, text: 'Hammer Closed', urgency: 'urgency-closed', totalSeconds: 0 };
    }
    const diff = new Date(endsAt).getTime() - now;
    if (diff <= 0) {
      return { isClosed: true, text: 'Hammer Closed', urgency: 'urgency-closed', totalSeconds: 0 };
    }
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let text = '';
    if (hours > 0) {
      text = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else {
      text = `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    let urgency: 'urgency-normal' | 'urgency-warning' | 'urgency-critical' = 'urgency-normal';
    if (totalSeconds <= 120) {
      urgency = 'urgency-critical'; // Under 2 mins: Anti-sniping active
    } else if (totalSeconds <= 900) {
      urgency = 'urgency-warning'; // Under 15 mins
    }

    return { isClosed: false, text, urgency, totalSeconds };
  };

  // Open Quick Bid Modal
  const openBidModal = (auc: AuctionRecord) => {
    setQuickBidAuction(auc);
    const minRequired = auc.pricing.currentBid + auc.pricing.minIncrement;
    setBidAmount(String(minRequired));
    setBidFeedback(null);
  };

  // Handle bid submit
  const handlePlaceBid = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickBidAuction) return;
    const amount = Number(bidAmount);
    const minRequired = quickBidAuction.pricing.currentBid + quickBidAuction.pricing.minIncrement;

    if (!amount || amount < minRequired) {
      setBidFeedback({
        type: 'error',
        message: `Your bid must be at least ${formatINR(minRequired)} (Current: ${formatINR(quickBidAuction.pricing.currentBid)} + Min step: ${formatINR(quickBidAuction.pricing.minIncrement)}).`
      });
      return;
    }

    setSubmittingBid(true);
    setBidFeedback(null);
    try {
      const res = await fetch(`/api/auctions/${encodeURIComponent(quickBidAuction.id)}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bidderName: bidderName.trim() || 'Gujarat Partner Dealer',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bid rejected by auction server');

      setBidFeedback({
        type: 'success',
        message: `✓ Bid placed successfully! ${formatINR(amount)} is now leading for Lot #${quickBidAuction.auctionNumber}.`
      });
      await loadAuctions();
    } catch (err: any) {
      setBidFeedback({
        type: 'error',
        message: err.message || 'Could not place bid'
      });
    } finally {
      setSubmittingBid(false);
    }
  };

  // Admin duration extend
  const handleAdminExtend = async (auctionId: string, minutes: number) => {
    try {
      setExtendingTime(true);
      const res = await fetch(`/api/auctions/${encodeURIComponent(auctionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendMinutes: minutes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend auction');
      setBidFeedback({
        type: 'success',
        message: `✓ Auction hammer extended by +${minutes} minutes!`
      });
      await loadAuctions();
    } catch (err: any) {
      setBidFeedback({
        type: 'error',
        message: err.message || 'Could not extend duration'
      });
    } finally {
      setExtendingTime(false);
    }
  };

  // Tab counts
  const liveCount = useMemo(() => auctions.filter(a => a.status === 'live').length, [auctions]);
  const yardCount = useMemo(() => auctions.filter(a => a.auctionType === 'offline' || a.auctionType === 'hybrid').length, [auctions]);
  const digitalCount = useMemo(() => auctions.filter(a => a.auctionType === 'online').length, [auctions]);

  // Filtered & sorted live auctions
  const filteredAuctions = useMemo(() => {
    let list = auctions;

    if (activeTab === 'live') {
      list = list.filter(a => a.status === 'live');
    } else if (activeTab === 'yard') {
      list = list.filter(a => a.auctionType === 'offline' || a.auctionType === 'hybrid');
    } else if (activeTab === 'digital') {
      list = list.filter(a => a.auctionType === 'online');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.auctionNumber.toLowerCase().includes(q) ||
        a.vehicle.make.toLowerCase().includes(q) ||
        a.vehicle.model.toLowerCase().includes(q) ||
        (a.vehicle.variant || '').toLowerCase().includes(q) ||
        (a.vehicle.registration || '').toLowerCase().includes(q) ||
        (a.venue?.city || a.vehicle.city || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'ending') {
        return new Date(a.schedule.endsAt).getTime() - new Date(b.schedule.endsAt).getTime();
      }
      if (sortBy === 'bid-high') {
        return b.pricing.currentBid - a.pricing.currentBid;
      }
      if (sortBy === 'bid-low') {
        return a.pricing.currentBid - b.pricing.currentBid;
      }
      if (sortBy === 'score') {
        return (b.vehicle.conditionScore || 90) - (a.vehicle.conditionScore || 90);
      }
      return 0;
    });
  }, [auctions, activeTab, searchQuery, sortBy]);

  const isAdmin = userRole === 'superadmin' || userRole === 'manager' || userRole === 'admin';

  return (
    <>
      <PageHero
        eyebrow="CARS21 LIVE B2B AUCTION ENGINE"
        title="Live Dealer & Yard Car Auctions"
        copy="Verified trade exchange for verified dealers. Physical yard lots in Junagadh, Rajkot, Ahmedabad, and live digital bidding."
      />

      <section className="container" style={{ paddingBottom: '80px', paddingTop: '24px' }}>
        {/* TOP STATS & LIVE SYNC STRIP */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 800 }}>
              <span className="auction-pulse-dot" style={{ background: '#16a34a' }} />
              {liveCount} Live Bidding Lots
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 700 }}>
              <MapPin size={12} /> {yardCount} Junagadh Yard Lots
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', background: '#eff6ff', color: '#1e40af', fontSize: '11px', fontWeight: 700 }}>
              <Sparkles size={12} /> {digitalCount} Digital Lots
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700 }}>
              <Trophy size={12} /> {completedAuctions.length} Concluded
            </span>
          </div>

          <button
            type="button"
            onClick={loadAuctions}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Live Sync
          </button>
        </div>

        {/* CONTROLS BAR: CATEGORY TABS, SEARCH & SORT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {/* CATEGORY TABS - Horizontal Touch Scroller on Mobile */}
          <div className="auction-category-tabs-scroller" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: activeTab === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: activeTab === 'all' ? '#eff6ff' : '#ffffff',
                color: activeTab === 'all' ? '#1d4ed8' : '#475569',
                fontSize: '12.5px',
                fontWeight: 750,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CarFront size={14} /> All Lots ({auctions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('live')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: activeTab === 'live' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                background: activeTab === 'live' ? '#fef2f2' : '#ffffff',
                color: activeTab === 'live' ? '#dc2626' : '#475569',
                fontSize: '12.5px',
                fontWeight: 750,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span className="auction-pulse-dot" style={{ background: '#dc2626' }} /> Live Now ({liveCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('yard')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: activeTab === 'yard' ? '2px solid #d97706' : '1px solid #e2e8f0',
                background: activeTab === 'yard' ? '#fffbeb' : '#ffffff',
                color: activeTab === 'yard' ? '#b45309' : '#475569',
                fontSize: '12.5px',
                fontWeight: 750,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MapPin size={14} /> Junagadh Yard Lots ({yardCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('digital')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: activeTab === 'digital' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: activeTab === 'digital' ? '#eff6ff' : '#ffffff',
                color: activeTab === 'digital' ? '#1d4ed8' : '#475569',
                fontSize: '12.5px',
                fontWeight: 750,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} /> Digital Lots ({digitalCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: activeTab === 'completed' ? '2px solid #ca8a04' : '1px solid #e2e8f0',
                background: activeTab === 'completed' ? '#fefce8' : '#ffffff',
                color: activeTab === 'completed' ? '#854d0e' : '#475569',
                fontSize: '12.5px',
                fontWeight: 750,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Award size={14} /> Concluded Lots ({completedAuctions.length})
            </button>
          </div>

          {/* SEARCH & SORT TOOLBAR */}
          {activeTab !== 'completed' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search lot by make, model, variant, lot #, or yard city..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    paddingLeft: '36px',
                    paddingRight: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} color="#64748b" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  style={{
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                    fontWeight: 600
                  }}
                >
                  <option value="ending">Ending Soonest</option>
                  <option value="bid-high">Highest Bid First</option>
                  <option value="bid-low">Lowest Bid First</option>
                  <option value="score">Inspection Score</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* AUCTION LISTING CARDS GRID (LIKE CAR LISTING) */}
        {activeTab !== 'completed' ? (
          filteredAuctions.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <CarFront size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                No active auction lots found
              </h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
                {searchQuery ? `No lots matching "${searchQuery}". Try clearing search.` : 'There are no active auction lots in this category currently.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="button button-outline button-small"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="auction-grid car-grid">
              {filteredAuctions.map(auc => {
                const timer = getAuctionTimer(auc.schedule.endsAt, auc.status);
                const isYard = auc.auctionType === 'offline' || auc.auctionType === 'hybrid';
                const minNextBid = auc.pricing.currentBid + auc.pricing.minIncrement;

                return (
                  <article
                    key={auc.id}
                    className="car-card minimal-car-card auction-lot-card"
                    tabIndex={0}
                  >
                    {/* 1. CAR PHOTO & BADGES */}
                    <div
                      className="car-photo auction-card-photo"
                      onClick={() => setDetailAuction(auc)}
                      title="Click to view complete inspection dossier & yard venue"
                    >
                      <img
                        src={auc.vehicle.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'}
                        alt={`${auc.vehicle.year} ${auc.vehicle.make} ${auc.vehicle.model}`}
                        loading="lazy"
                        className="car-photo-img"
                      />

                      {/* Top-Left Badges: Live / Yard / Digital */}
                      <div className="auction-card-badges-top-left">
                        {auc.status === 'live' && !timer.isClosed ? (
                          <span className="auction-badge-live">
                            <span className="auction-pulse-dot" /> LIVE
                          </span>
                        ) : timer.isClosed ? (
                          <span className="auction-badge-closed">CLOSED</span>
                        ) : (
                          <span className="auction-badge-upcoming">UPCOMING</span>
                        )}

                        {isYard ? (
                          <span className="auction-badge-yard">
                            <MapPin size={10} /> {auc.venue?.city || auc.vehicle.city || 'Junagadh'}
                          </span>
                        ) : (
                          <span className="auction-badge-digital">
                            <Sparkles size={10} /> Digital
                          </span>
                        )}
                      </div>

                      {/* Top-Right Badge: Inspection Score */}
                      <div className="auction-card-badges-top-right">
                        <span className="auction-badge-score">
                          ★ {auc.vehicle.conditionScore || 90}/100
                        </span>
                      </div>

                      {/* Bottom-Left Pill: Lot Number */}
                      <div className="auction-card-lot-pill">
                        LOT #{auc.auctionNumber}
                      </div>
                    </div>

                    {/* 2. CARD BODY */}
                    <div className="car-card-body auction-card-body">
                      {/* Vehicle Title & Specs */}
                      <div
                        className="car-title-block"
                        onClick={() => setDetailAuction(auc)}
                        style={{ cursor: 'pointer' }}
                      >
                        <h3 className="car-name" title={`${auc.vehicle.year} ${auc.vehicle.make} ${auc.vehicle.model}`}>
                          <span className="car-year">{auc.vehicle.year}</span> {auc.vehicle.make} {auc.vehicle.model}
                        </h3>
                        <p className="auction-card-specs">
                          {auc.vehicle.variant || ''} • {auc.vehicle.km?.toLocaleString('en-IN')} km • {auc.vehicle.fuel} • {auc.vehicle.transmission}
                        </p>
                      </div>

                      {/* 3. DYNAMIC COUNTDOWN TIMER */}
                      <div className={`auction-timer-banner ${timer.urgency}`}>
                        <span className="auction-timer-text">
                          <Clock3 size={13} className={timer.urgency === 'urgency-critical' ? 'animate-pulse' : ''} />
                          {timer.isClosed ? 'Hammer Closed' : `Ends in: ${timer.text}`}
                        </span>
                        {timer.urgency === 'urgency-critical' && !timer.isClosed && (
                          <span className="auction-timer-anti-sniping" title="Anti-sniping active: Bids placed in final 2 minutes extend time by 60s">
                            Anti-Sniping
                          </span>
                        )}
                      </div>

                      {/* 4. CURRENT HIGHEST / LATEST BID */}
                      <div className="auction-card-bid-section">
                        <div className="auction-bid-meta-row">
                          <span className="auction-bid-label">CURRENT HIGHEST BID</span>
                          <span className="auction-bids-count">
                            {auc.pricing.totalBids > 0 ? `${auc.pricing.totalBids} live bids` : 'Opening Reference'}
                          </span>
                        </div>
                        <div className="auction-card-price-row">
                          <strong className="auction-price-tag">{formatINR(auc.pricing.currentBid)}</strong>
                          <span className="auction-min-step">Min: {formatINR(minNextBid)}</span>
                        </div>
                      </div>

                      {/* 5. "BID NOW" & "DETAILS" BUTTONS */}
                      <div className="auction-card-actions">
                        <button
                          type="button"
                          className="auction-card-bid-btn"
                          disabled={timer.isClosed}
                          onClick={() => openBidModal(auc)}
                          aria-label={`Place bid on Lot ${auc.auctionNumber}`}
                        >
                          <Gavel size={14} />
                          <span>{timer.isClosed ? 'Hammer Closed' : 'Bid Now'}</span>
                        </button>

                        <button
                          type="button"
                          className="auction-card-details-btn"
                          onClick={() => setDetailAuction(auc)}
                          aria-label={`View dossier for Lot ${auc.auctionNumber}`}
                        >
                          <span>Dossier</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : (
          /* CONCLUDED AUCTIONS VIEW (When 'completed' tab is clicked) */
          <div>
            {completedAuctions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                No concluded auctions on record yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                {completedAuctions.map(auc => {
                  const isYard = auc.auctionType === 'offline' || auc.auctionType === 'hybrid';
                  const winningAmount = auc.winner?.winningPrice || auc.pricing.currentBid;
                  return (
                    <div
                      key={auc.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ position: 'relative', height: '160px', background: '#f1f5f9' }}>
                        <img
                          src={auc.vehicle.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'}
                          alt={`${auc.vehicle.year} ${auc.vehicle.make} ${auc.vehicle.model}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 800
                          }}
                        >
                          {auc.auctionNumber}
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: '#ca8a04',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Award size={12} /> HAMMER STRUCK
                        </span>
                      </div>

                      <div style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isYard ? '#fef3c7' : '#eff6ff', color: isYard ? '#92400e' : '#1e40af' }}>
                            {isYard ? `Yard: ${auc.venue?.city || 'Junagadh'}` : 'Online'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Reg: {auc.vehicle.registration}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                          {auc.vehicle.year} {auc.vehicle.make} {auc.vehicle.model}
                        </h3>
                        <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
                          {auc.vehicle.variant} • {auc.vehicle.km?.toLocaleString('en-IN')} km • Score: {auc.vehicle.conditionScore}/100
                        </p>

                        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>
                              WINNING HAMMER BID
                            </span>
                            <span style={{ fontSize: '11px', color: '#a16207', fontWeight: 600 }}>
                              {auc.pricing.totalBids} bids competed
                            </span>
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#713f12', margin: '2px 0 6px' }}>
                            {formatINR(winningAmount)}
                          </div>

                          {auc.winner && (
                            <div style={{ borderTop: '1px dashed #fde047', paddingTop: '6px', marginTop: '6px', fontSize: '11px' }}>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                🏆 Winning Partner: {auc.winner.dealerName || auc.winner.name}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                                Date: {new Date(auc.winner.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            QUICK BID MODAL (Opens directly when clicking 'Bid Now' on any card)
            ========================================================================= */}
        {quickBidAuction && (() => {
          const timer = getAuctionTimer(quickBidAuction.schedule.endsAt, quickBidAuction.status);
          const minRequired = quickBidAuction.pricing.currentBid + quickBidAuction.pricing.minIncrement;
          const isYard = quickBidAuction.auctionType === 'offline' || quickBidAuction.auctionType === 'hybrid';

          return (
            <div className="quick-bid-modal-overlay" onClick={() => setQuickBidAuction(null)}>
              <div className="quick-bid-modal-card" onClick={e => e.stopPropagation()}>
                {/* MODAL HEADER */}
                <div className="quick-bid-modal-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        LOT #{quickBidAuction.auctionNumber}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                        {isYard ? `Yard: ${quickBidAuction.venue?.city || 'Junagadh'}` : 'Digital Online'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '3px 0 0' }}>
                      {quickBidAuction.vehicle.year} {quickBidAuction.vehicle.make} {quickBidAuction.vehicle.model}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuickBidAuction(null)}
                    style={{
                      border: 'none',
                      background: '#f1f5f9',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                    aria-label="Close modal"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* MODAL BODY */}
                <div className="quick-bid-modal-body">
                  {/* PREVIEW STRIP & TIMER */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <img
                      src={quickBidAuction.vehicle.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'}
                      alt=""
                      style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {quickBidAuction.vehicle.variant} • Reg: {quickBidAuction.vehicle.registration}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span className={`auction-timer-banner ${timer.urgency}`} style={{ padding: '3px 8px', fontSize: '11px' }}>
                          <Clock3 size={12} className={timer.urgency === 'urgency-critical' ? 'animate-pulse' : ''} />
                          {timer.isClosed ? 'Hammer Closed' : `Ends in: ${timer.text}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CURRENT BID HIGHLIGHT */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#1e40af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        CURRENT HIGHEST BID
                      </span>
                      <div style={{ fontSize: '28px', fontWeight: 850, color: '#0f172a', margin: '2px 0 0' }}>
                        {formatINR(quickBidAuction.pricing.currentBid)}
                      </div>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={13} /> {quickBidAuction.pricing.totalBids} Live Bids Placed
                    </span>
                  </div>

                  {/* BIDDING FORM */}
                  <form onSubmit={handlePlaceBid} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                        Dealership / Bidder Name
                        <input
                          type="text"
                          required
                          value={bidderName}
                          onChange={e => setBidderName(e.target.value)}
                          placeholder="e.g. Junagadh Prime Wheels"
                          style={{ height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </label>

                      <label className="field-label" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                        Bid Amount (₹)
                        <input
                          type="number"
                          required
                          min={minRequired}
                          step={quickBidAuction.pricing.minIncrement}
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          placeholder={`Min: ${formatINR(minRequired)}`}
                          style={{ height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                        />
                      </label>
                    </div>

                    {/* QUICK INCREMENT CHIPS */}
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        1-Click Quick Increments:
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                          quickBidAuction.pricing.minIncrement,
                          quickBidAuction.pricing.minIncrement * 2,
                          quickBidAuction.pricing.minIncrement * 5,
                          100000
                        ].map(inc => (
                          <button
                            key={inc}
                            type="button"
                            onClick={() => setBidAmount(String(quickBidAuction.pricing.currentBid + inc))}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              fontSize: '11.5px',
                              fontWeight: 750,
                              cursor: 'pointer',
                              color: '#2563eb'
                            }}
                          >
                            +{formatINR(inc)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SUBMIT BUTTON (FULL WIDTH - NO OVERFLOW) */}
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={timer.isClosed || submittingBid}
                      style={{
                        width: '100%',
                        height: '46px',
                        fontSize: '14px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <Gavel size={16} />
                      {submittingBid
                        ? 'Transmitting Bid to Auction Server...'
                        : `Submit Qualifying Bid (${formatINR(Number(bidAmount) || minRequired)})`}
                    </button>
                  </form>

                  {/* FEEDBACK ALERT */}
                  {bidFeedback && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: bidFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        border: bidFeedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                        color: bidFeedback.type === 'success' ? '#065f46' : '#991b1b'
                      }}
                    >
                      {bidFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{bidFeedback.message}</span>
                    </div>
                  )}

                  {/* ANTI-SNIPING NOTICE */}
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                    <b>Anti-Sniping Rule:</b> Any bid submitted in the final 2 minutes automatically extends the hammer time by 60 seconds to ensure transparent fair trade.
                  </p>

                  {/* ADMIN EXTEND DURATION TOOLBAR */}
                  {isAdmin && (
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '10px 14px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#c2410c', marginBottom: '6px' }}>
                        Superadmin / Manager Time Extension Toolbar:
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[15, 30, 60, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            disabled={extendingTime}
                            onClick={() => handleAdminExtend(quickBidAuction.id, mins)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #fdba74',
                              background: '#ffffff',
                              color: '#c2410c',
                              fontSize: '11px',
                              fontWeight: 750,
                              cursor: extendingTime ? 'wait' : 'pointer'
                            }}
                          >
                            +{mins < 60 ? `${mins}m` : `${mins / 60}h`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* LIVE RECENT BIDS STREAM */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Flame size={14} color="#ea580c" />
                      Live Bid Stream for Lot #{quickBidAuction.auctionNumber}
                    </div>
                    {quickBidAuction.bids.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '11.5px', background: '#f8fafc', borderRadius: '8px' }}>
                        No bids placed yet. Place the opening bid!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {quickBidAuction.bids.slice(0, 5).map((b, idx) => (
                          <div
                            key={b.id || idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: b.isLeading ? '#ecfdf5' : '#f8fafc',
                              border: b.isLeading ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                              borderRadius: '8px',
                              fontSize: '11.5px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                              {b.bidderName} {b.isLeading && <span style={{ marginLeft: '4px', fontSize: '9px', fontWeight: 800, background: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>LEADER</span>}
                            </span>
                            <b style={{ color: '#0f172a' }}>{formatINR(b.amount)}</b>
                            <small style={{ color: '#64748b' }}>
                              {new Date(b.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* =========================================================================
            LOT DOSSIER MODAL (Yard Venue Details, Inspection Score, Title Escrow)
            ========================================================================= */}
        {detailAuction && (() => {
          const isYard = detailAuction.auctionType === 'offline' || detailAuction.auctionType === 'hybrid';
          const timer = getAuctionTimer(detailAuction.schedule.endsAt, detailAuction.status);

          return (
            <div className="quick-bid-modal-overlay" onClick={() => setDetailAuction(null)}>
              <div className="quick-bid-modal-card" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                {/* HEADER */}
                <div className="quick-bid-modal-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                        LOT #{detailAuction.auctionNumber}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>
                        ★ {detailAuction.vehicle.conditionScore || 90}/100 Condition Score
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '3px 0 0' }}>
                      {detailAuction.vehicle.year} {detailAuction.vehicle.make} {detailAuction.vehicle.model}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailAuction(null)}
                    style={{
                      border: 'none',
                      background: '#f1f5f9',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                    aria-label="Close modal"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* BODY */}
                <div className="quick-bid-modal-body">
                  <div style={{ height: '220px', borderRadius: '12px', overflow: 'hidden', background: '#f1f5f9' }}>
                    <img
                      src={detailAuction.vehicle.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* SPECIFICATION TILES */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[
                      ['Registration', detailAuction.vehicle.registration],
                      ['Fuel & Gearbox', `${detailAuction.vehicle.fuel} ${detailAuction.vehicle.transmission}`],
                      ['Odometer', `${detailAuction.vehicle.km?.toLocaleString('en-IN')} km`],
                      ['Current Lead Bid', formatINR(detailAuction.pricing.currentBid)],
                      ['Min Step Increment', formatINR(detailAuction.pricing.minIncrement)],
                      ['Inspection Score', `${detailAuction.vehicle.conditionScore || 90} / 100`],
                    ].map(x => (
                      <div key={x[0]} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{x[0]}</span>
                        <b style={{ fontSize: '12.5px', color: '#0f172a' }}>{x[1]}</b>
                      </div>
                    ))}
                  </div>

                  {/* PHYSICAL YARD LOCATION (IF APPLICABLE) */}
                  {isYard && detailAuction.venue && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: 800, fontSize: '13px', marginBottom: '4px' }}>
                        <MapPin size={15} color="#2563eb" />
                        <span>Physical Yard Inspection Venue (Junagadh Hub)</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                        <b>{detailAuction.venue.name}</b><br />
                        {detailAuction.venue.address}, {detailAuction.venue.city} - {detailAuction.venue.pincode}<br />
                        {detailAuction.venue.landmark && <span style={{ color: '#64748b' }}>Landmark: {detailAuction.venue.landmark}<br /></span>}
                        <div style={{ marginTop: '6px', color: '#0369a1', fontWeight: 600 }}>
                          ⏰ Inspection: {detailAuction.venue.gateEntryTiming}
                        </div>
                        {detailAuction.venue.coordinatorName && (
                          <div style={{ marginTop: '4px', color: '#475569', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} color="#16a34a" />
                            Yard Coordinator: <b>{detailAuction.venue.coordinatorName}</b> ({detailAuction.venue.coordinatorPhone})
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ESCROW & TITLE ASSURANCE */}
                  <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '11px', color: '#166534', lineHeight: 1.4 }}>
                      <b>Cars21 Escrow & Title Guarantee:</b> Verified RC documents. Winning bids transfer clear title upon payment with physical gate pass delivery.
                    </div>
                  </div>

                  {/* MODAL ACTIONS */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={timer.isClosed}
                      onClick={() => {
                        setDetailAuction(null);
                        openBidModal(detailAuction);
                      }}
                      style={{ flex: 1, height: '42px', fontSize: '13.5px', fontWeight: 800 }}
                    >
                      <Gavel size={15} />
                      {timer.isClosed ? 'Bidding Closed' : 'Place Qualifying Bid'}
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => setDetailAuction(null)}
                      style={{ height: '42px', padding: '0 16px' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    </>
  );
}
