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
  Award
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
  const [selectedAuctionId, setSelectedAuctionId] = useState<string>('');
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidderName, setBidderName] = useState('Junagadh Prime Wheels');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isClosed: boolean }>({ minutes: 0, seconds: 0, isClosed: false });

  // Load live auctions from backend
  const loadAuctions = async () => {
    try {
      const res = await fetch('/api/auctions', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        const liveAndUpcoming = (data.auctions || []).filter((a: AuctionRecord) => a.status === 'live' || a.status === 'upcoming');
        setAuctions(liveAndUpcoming);
        setCompletedAuctions(data.completed || []);
        if (!selectedAuctionId && liveAndUpcoming.length > 0) {
          setSelectedAuctionId(liveAndUpcoming[0].id);
        }
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

  const activeAuction = useMemo(() => {
    return auctions.find(a => a.id === selectedAuctionId) || auctions[0] || null;
  }, [auctions, selectedAuctionId]);

  // Live Countdown timer
  useEffect(() => {
    if (!activeAuction) return;

    const calculateTime = () => {
      const end = new Date(activeAuction.schedule.endsAt).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isClosed: true });
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ minutes, seconds, isClosed: false });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [activeAuction]);

  // Handle bid submit
  const handlePlaceBid = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeAuction) return;
    const amount = Number(bidAmount);
    const minRequired = activeAuction.pricing.currentBid + activeAuction.pricing.minIncrement;

    if (!amount || amount < minRequired) {
      setFeedback({
        type: 'error',
        message: `Your bid must be at least ${formatINR(minRequired)} (Current bid: ${formatINR(activeAuction.pricing.currentBid)} + Min increment: ${formatINR(activeAuction.pricing.minIncrement)}).`
      });
      return;
    }

    setSubmittingBid(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/auctions/${encodeURIComponent(activeAuction.id)}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bidderName: bidderName.trim() || 'Gujarat Partner Dealer',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bid rejected by auction server');

      setFeedback({
        type: 'success',
        message: `Bid placed successfully! ${formatINR(amount)} is now leading for Lot ${activeAuction.auctionNumber}.`
      });
      setBidAmount('');
      await loadAuctions();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Could not place bid'
      });
    } finally {
      setSubmittingBid(false);
    }
  };

  const isOffline = activeAuction?.auctionType === 'offline' || activeAuction?.auctionType === 'hybrid';
  const minRequiredBid = activeAuction ? activeAuction.pricing.currentBid + activeAuction.pricing.minIncrement : 0;

  return (
    <>
      <PageHero
        eyebrow="CARS21 LIVE B2B AUCTION ENGINE"
        title="Live Dealer & Yard Car Auctions"
        copy="Verified trade exchange for verified dealers. Physical yard lots in Junagadh, Rajkot, Ahmedabad, and live digital bidding."
      />

      <section className="container" style={{ paddingBottom: '70px' }}>
        {/* Active Lots Selector Strip */}
        <div style={{ margin: '0 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CURRENT LIVE LOTS
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
              Select an Active Auction Lot
            </h2>
          </div>

          <button
            type="button"
            onClick={loadAuctions}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Live Sync
          </button>
        </div>

        {/* Lot selection pills */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '24px' }}>
          {auctions.map(auc => {
            const isSelected = auc.id === activeAuction?.id;
            const isYard = auc.auctionType === 'offline' || auc.auctionType === 'hybrid';
            return (
              <button
                key={auc.id}
                type="button"
                onClick={() => {
                  setSelectedAuctionId(auc.id);
                  setFeedback(null);
                  setBidAmount('');
                }}
                style={{
                  minWidth: '240px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb' }}>{auc.auctionNumber}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isYard ? '#fef3c7' : '#dcfce7', color: isYard ? '#92400e' : '#166534' }}>
                    {isYard ? `Yard: ${auc.venue?.city || 'Junagadh'}` : 'Online'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {auc.vehicle.year} {auc.vehicle.make} {auc.vehicle.model}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                  {formatINR(auc.pricing.currentBid)}
                </div>
              </button>
            );
          })}
        </div>

        {activeAuction ? (
          <div className="auction-layout">
            <div className="auction-main">
              {/* Car Showcase Card */}
              <div className="auction-car">
                <div className="auction-photo photo-two" style={{ overflow: 'hidden', borderRadius: '12px' }}>
                  <img
                    src={activeAuction.vehicle.image || '/images/kars21-hero.png'}
                    alt={`${activeAuction.vehicle.year} ${activeAuction.vehicle.make} ${activeAuction.vehicle.model}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="demo-tag" style={{ background: '#2563eb', color: '#fff', fontWeight: 800 }}>
                      LOT {activeAuction.auctionNumber}
                    </span>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isOffline ? '#fef3c7' : '#dcfce7',
                        color: isOffline ? '#92400e' : '#166534',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {isOffline ? <MapPin size={12} /> : <Sparkles size={12} />}
                      {isOffline ? `PHYSICAL YARD AUCTION (${activeAuction.venue?.city || 'Junagadh'})` : 'ONLINE DIGITAL BIDDING'}
                    </span>
                  </div>

                  <h2>{activeAuction.vehicle.year} {activeAuction.vehicle.make} {activeAuction.vehicle.model}</h2>
                  <p>
                    {activeAuction.vehicle.variant} • {activeAuction.vehicle.km.toLocaleString('en-IN')} km • {activeAuction.vehicle.fuel} • {activeAuction.vehicle.transmission} • Reg: {activeAuction.vehicle.registration}
                  </p>

                  <div className="auction-meta">
                    <span><ShieldCheck size={16} /> {activeAuction.vehicle.conditionScore} Inspection Score</span>
                    <span style={{ color: timeLeft.isClosed ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                      <Clock3 size={16} />
                      {timeLeft.isClosed
                        ? 'Hammer Closed'
                        : `Ends in: ${String(timeLeft.minutes).padStart(2, '0')}m ${String(timeLeft.seconds).padStart(2, '0')}s`}
                    </span>
                  </div>

                  {/* Physical Yard Address & Inspection Timing (if offline) */}
                  {isOffline && activeAuction.venue && (
                    <div style={{ marginTop: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: 800, fontSize: '13px', marginBottom: '4px' }}>
                        <MapPin size={15} color="#2563eb" />
                        <span>Physical Yard Inspection & Venue (Junagadh Hub)</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                        <b>{activeAuction.venue.name}</b><br />
                        {activeAuction.venue.address}, {activeAuction.venue.city} - {activeAuction.venue.pincode}<br />
                        {activeAuction.venue.landmark && <span style={{ color: '#64748b' }}>Landmark: {activeAuction.venue.landmark}<br /></span>}
                        <div style={{ marginTop: '6px', color: '#0369a1', fontWeight: 600 }}>
                          ⏰ Inspection: {activeAuction.venue.gateEntryTiming}
                        </div>
                        {activeAuction.venue.coordinatorName && (
                          <div style={{ marginTop: '4px', color: '#475569', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} color="#16a34a" />
                            Yard Coordinator: <b>{activeAuction.venue.coordinatorName}</b> ({activeAuction.venue.coordinatorPhone})
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Bidding Panel */}
              <div className="auction-bid-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span className="eyebrow">CURRENT HIGHEST BID</span>
                    <h2 style={{ fontSize: '32px', margin: '4px 0 0' }}>{formatINR(activeAuction.pricing.currentBid)}</h2>
                  </div>
                  <div>
                    <span className="leading-tag" style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
                      <Check size={14} /> {activeAuction.pricing.totalBids} Live Bids Placed
                    </span>
                  </div>
                </div>

                <form onSubmit={handlePlaceBid} style={{ marginTop: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(200px, 1.2fr)', gap: '10px', marginBottom: '10px' }}>
                    <label className="field-label">
                      Your Dealership / Bidder Name
                      <input
                        type="text"
                        required
                        value={bidderName}
                        onChange={e => setBidderName(e.target.value)}
                        placeholder="e.g. Saurashtra Auto Hub"
                      />
                    </label>

                    <label className="field-label">
                      Bid Amount (₹)
                      <input
                        type="number"
                        required
                        min={minRequiredBid}
                        step={activeAuction.pricing.minIncrement}
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        placeholder={`Min: ${formatINR(minRequiredBid)}`}
                      />
                    </label>
                  </div>

                  {/* Quick increment chips */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Quick Increment:</span>
                    {[activeAuction.pricing.minIncrement, activeAuction.pricing.minIncrement * 2, activeAuction.pricing.minIncrement * 5].map(inc => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setBidAmount(String(activeAuction.pricing.currentBid + inc))}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: '#2563eb'
                        }}
                      >
                        +{formatINR(inc)}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={timeLeft.isClosed || submittingBid}
                    style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 800 }}
                  >
                    {submittingBid ? 'Transmitting Bid to Auction Server...' : `Submit Qualifying Bid (${formatINR(Number(bidAmount) || minRequiredBid)})`}
                    <ArrowRight size={16} />
                  </button>
                </form>

                {feedback && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                      border: feedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      color: feedback.type === 'success' ? '#065f46' : '#991b1b'
                    }}
                  >
                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.message}</span>
                  </div>
                )}

                <p className="detail-disclosure" style={{ marginTop: '12px' }}>
                  Minimum increment: {formatINR(activeAuction.pricing.minIncrement)}. Anti-sniping: Any bid received within the final 2 minutes automatically extends the hammer time by 60 seconds.
                </p>
              </div>

              {/* Recent live bids stream */}
              <div className="auction-activity">
                <b style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={15} color="#ea580c" />
                  Live Bid Activity Stream ({activeAuction.auctionNumber})
                </b>
                {activeAuction.bids.length === 0 ? (
                  <div style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>No bids placed yet. Be the first to place the opening bid!</div>
                ) : (
                  activeAuction.bids.slice(0, 6).map((b, idx) => (
                    <div key={b.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {b.bidderName} {b.isLeading && <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>LEADER</span>}
                      </span>
                      <b>{formatINR(b.amount)}</b>
                      <small>{new Date(b.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Details */}
            <aside className="auction-aside">
              <span className="eyebrow">LOT SPECIFICATIONS</span>
              <h3>Lot {activeAuction.auctionNumber}</h3>
              {[
                ['Starting Reference', formatINR(activeAuction.pricing.startingPrice)],
                ['Minimum Step', formatINR(activeAuction.pricing.minIncrement)],
                ['Inspection Score', `${activeAuction.vehicle.conditionScore} / 100`],
                ['Vehicle Reg', activeAuction.vehicle.registration],
                ['Engine & Fuel', `${activeAuction.vehicle.fuel} ${activeAuction.vehicle.transmission}`],
                ['Primary Yard City', activeAuction.venue?.city || activeAuction.vehicle.city || 'Junagadh'],
                ['Auction Format', isOffline ? 'Physical Yard Inspection + Live Hammer' : 'Online Digital Bidding'],
              ].map(x => (
                <div className="auction-side-row" key={x[0]}>
                  <span>{x[0]}</span>
                  <b>{x[1]}</b>
                </div>
              ))}

              <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <b style={{ fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <ShieldCheck size={16} color="#16a34a" />
                  Cars21 Escrow & Title Assurance
                </b>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                  Every auction lot is physically inspected by Cars21 engineers with verified RC documents. Winning bids transfer clear title upon payment.
                </p>
              </div>

              <Link className="text-link" to="/become-a-dealer" style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Apply as verified dealer partner <ArrowRight size={14} />
              </Link>
            </aside>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px' }}>
            <h3>No Live Auctions currently running</h3>
            <p style={{ color: '#64748b' }}>Check back shortly or view recently concluded auctions below.</p>
          </div>
        )}

        {/* RECENT CONCLUDED AUCTIONS & WINNERS (Requirement 10) */}
        <div style={{ marginTop: '60px' }}>
          <div style={{ marginBottom: '22px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#ca8a04', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trophy size={14} color="#ca8a04" /> CONCLUDED AUCTION LOTS & WINNERS
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px' }}>
              Recent Auction Listing & Winning Hammer Prices
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
              Official record of concluded vehicle lots organized by Cars21 superadmin across Junagadh, Rajkot, and Gujarat delivery hubs.
            </p>
          </div>

          {completedAuctions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
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
                        {auc.vehicle.variant} • {auc.vehicle.km.toLocaleString('en-IN')} km • Score: {auc.vehicle.conditionScore}/100
                      </p>

                      {/* Winner Showcase Box */}
                      <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>
                            WINNING BID (PRICE)
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
                              🏆 Winner: {auc.winner.dealerName || auc.winner.name}
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
      </section>
    </>
  );
}
