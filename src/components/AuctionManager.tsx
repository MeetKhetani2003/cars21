'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { 
  Gavel, 
  Plus, 
  MapPin, 
  Calendar, 
  Clock3, 
  Trophy, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  CarFront, 
  TrendingUp, 
  Phone, 
  User, 
  Eye, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
  Crop
} from 'lucide-react';
import type { AuctionRecord } from '@/app/api/auctions/route';
import { VehicleImageAdjuster, type VehicleCropResult } from './VehicleImageAdjuster';

function formatINR(val: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

function getRemainingTimeText(endsAt?: string, status?: string): { text: string; color: string; isEndingSoon: boolean } {
  if (status === 'completed') {
    return { text: 'Concluded', color: '#64748b', isEndingSoon: false };
  }
  if (!endsAt) {
    return { text: 'Open Bidding', color: '#2563eb', isEndingSoon: false };
  }
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) {
    return { text: status === 'live' ? 'Time Expired (Hammering)' : 'Past Schedule', color: '#dc2626', isEndingSoon: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return { text: `${days}d ${hours % 24}h remaining`, color: '#2563eb', isEndingSoon: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${mins}m remaining`, color: hours < 2 ? '#ea580c' : '#2563eb', isEndingSoon: hours < 2 };
  }
  return { text: `${mins}m ${secs}s remaining`, color: '#dc2626', isEndingSoon: true };
}

export function AuctionManager({ role }: { role: 'superadmin' | 'manager' | 'admin' | 'vendor' }) {
  const [auctions, setAuctions] = useState<AuctionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<AuctionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'live' | 'upcoming' | 'completed' | 'offline' | 'online'>('all');

  // New auction form state
  const [auctionType, setAuctionType] = useState<'online' | 'offline' | 'hybrid'>('offline');
  const [title, setTitle] = useState('');
  // Venue
  const [venueName, setVenueName] = useState('Cars21 Central Yard & Delivery Hub');
  const [venueAddress, setVenueAddress] = useState('Plot No. 12/B, Junagadh-Rajkot National Highway, Near Bhesan Cross Road');
  const [venueCity, setVenueCity] = useState('Junagadh');
  const [venuePincode, setVenuePincode] = useState('362001');
  const [venueLandmark, setVenueLandmark] = useState('Opposite Agricultural University Research Farm');
  const [gateTiming, setGateTiming] = useState('09:30 AM to 11:30 AM Inspection. Live Hammer starts at 12:00 PM');
  const [coordinatorName, setCoordinatorName] = useState('Kishorebhai Bhalodia');
  const [coordinatorPhone, setCoordinatorPhone] = useState('+91 98251 44556');
  // Vehicle
  const [make, setMake] = useState('Hyundai');
  const [model, setModel] = useState('Creta');
  const [variant, setVariant] = useState('SX (O) 1.5 Diesel Automatic');
  const [year, setYear] = useState(2023);
  const [registration, setRegistration] = useState('GJ 11 AB 4589');
  const [km, setKm] = useState(26500);
  const [fuel, setFuel] = useState('Diesel');
  const [transmission, setTransmission] = useState('Automatic');
  const [conditionScore, setConditionScore] = useState(92);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80');
  // Pricing & Schedule
  const [startingPrice, setStartingPrice] = useState(1200000);
  const [reservePrice, setReservePrice] = useState(1350000);
  const [minIncrement, setMinIncrement] = useState(10000);
  const [durationMinutes, setDurationMinutes] = useState(120);

  // Quick Vehicle Auto-fill
  const [linkedCarId, setLinkedCarId] = useState<string>('');
  const [linkedInquiryId, setLinkedInquiryId] = useState<string>('');
  const [selectedVehicleOption, setSelectedVehicleOption] = useState<string>('');
  const [inventoryOptions, setInventoryOptions] = useState<any[]>([]);
  const [inquiryOptions, setInquiryOptions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Extend Duration State
  const [extendingAuction, setExtendingAuction] = useState<AuctionRecord | null>(null);
  const [customExtendMinutes, setCustomExtendMinutes] = useState<string>('30');
  const [extendDateTimeInput, setExtendDateTimeInput] = useState<string>('');
  const [extendTab, setExtendTab] = useState<'preset' | 'datetime'>('preset');
  const [extendingInFlight, setExtendingInFlight] = useState(false);

  // Vehicle image framing & website preview adjuster state:
  const [adjustingAuctionPhoto, setAdjustingAuctionPhoto] = useState<boolean>(false);

  const handleApplyAuctionCrop = (result: VehicleCropResult) => {
    setImageUrl(result.dataUrl);
    setAdjustingAuctionPhoto(false);
  };

  // Live countdown tick
  const [, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const loadVehicleOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const [carsRes, inqRes] = await Promise.all([
        fetch('/api/cars?limit=100', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ cars: [] })),
        fetch('/api/sell-inquiries', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ inquiries: [] })),
      ]);
      if (Array.isArray(carsRes.cars)) setInventoryOptions(carsRes.cars);
      if (Array.isArray(inqRes.inquiries)) setInquiryOptions(inqRes.inquiries);
    } catch (e) {
      console.warn('Could not load vehicle options for auction auto-fill:', e);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const handleSelectVehicleOption = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVehicleOption(val);
    if (!val) {
      setLinkedCarId('');
      setLinkedInquiryId('');
      return;
    }
    if (val.startsWith('inv:')) {
      const carId = val.replace('inv:', '');
      const car = inventoryOptions.find(c => c.id === carId);
      if (car) {
        setLinkedCarId(car.id);
        setLinkedInquiryId('');
        setMake(car.make || '');
        setModel(car.model || '');
        setVariant(car.variant || 'Standard');
        setYear(Number(car.year) || new Date().getFullYear());
        setRegistration(car.documentNumber || car.registration || 'GJ 11 AB 4589');
        setKm(Number(car.km) || 0);
        setFuel(car.fuel || 'Petrol');
        setTransmission(car.transmission || 'Manual');
        setConditionScore(Number(car.score) || 90);
        const img = car.image || (car.imageId ? `/api/photos/${car.imageId}` : '');
        if (img) setImageUrl(img);
        const pr = Number(car.price) || 500000;
        setStartingPrice(Math.round(pr * 0.8));
        setReservePrice(pr);
        setTitle(`${venueCity} ${car.year} ${car.make} ${car.model} ${auctionType === 'offline' ? 'Yard' : 'Digital'} Auction`);
      }
    } else if (val.startsWith('inq:')) {
      const inqId = val.replace('inq:', '');
      const inq = inquiryOptions.find(i => i.id === inqId);
      if (inq) {
        setLinkedInquiryId(inq.id);
        setLinkedCarId('');
        setMake(inq.vehicle?.make || inq.make || '');
        setModel(inq.vehicle?.model || inq.model || '');
        setVariant(inq.vehicle?.variant || inq.variant || 'Standard');
        setYear(Number(inq.vehicle?.year || inq.year) || new Date().getFullYear());
        setRegistration(inq.vehicle?.registrationNumber || inq.registration || inq.registrationNumber || 'GJ 11 AB 4589');
        setKm(Number(inq.vehicle?.km || inq.km) || 0);
        setFuel(inq.vehicle?.fuel || inq.fuel || 'Petrol');
        setTransmission(inq.vehicle?.transmission || inq.transmission || 'Manual');
        setConditionScore(Number(inq.conditionScore) || 90);
        const photoId = inq.photos?.frontId || inq.photoFrontId;
        const img = photoId ? `/api/photos/${photoId}` : '';
        if (img) setImageUrl(img);
        const pr = Number(inq.expectedPrice || inq.estimatedLow || 500000);
        setStartingPrice(Math.round(pr * 0.8));
        setReservePrice(pr);
        setTitle(`${venueCity} ${inq.vehicle?.year || inq.year} ${inq.vehicle?.make || inq.make} ${inq.vehicle?.model || inq.model} B2B Yard Auction`);
      }
    }
  };

  const handleClearVehicleLink = () => {
    setSelectedVehicleOption('');
    setLinkedCarId('');
    setLinkedInquiryId('');
  };

  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auctions', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load auctions');
      setAuctions(data.auctions || []);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to auctions service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  // Handle organize auction submit
  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title || `${venueCity} ${make} ${model} ${auctionType === 'offline' ? 'Yard' : 'Digital'} Auction`,
        auctionType,
        venue: (auctionType === 'offline' || auctionType === 'hybrid') ? {
          name: venueName,
          address: venueAddress,
          city: venueCity,
          state: 'Gujarat',
          pincode: venuePincode,
          landmark: venueLandmark,
          gateEntryTiming: gateTiming,
          coordinatorName,
          coordinatorPhone,
        } : undefined,
        vehicle: {
          carId: linkedCarId || undefined,
          inquiryId: linkedInquiryId || undefined,
          make,
          model,
          variant,
          year: Number(year),
          registration,
          km: Number(km),
          fuel,
          transmission,
          city: venueCity,
          conditionScore: Number(conditionScore),
          image: imageUrl,
          rcVerified: true,
        },
        pricing: {
          startingPrice: Number(startingPrice),
          reservePrice: Number(reservePrice),
          minIncrement: Number(minIncrement),
        },
        schedule: {
          durationMinutes: Number(durationMinutes),
          startsAt: new Date().toISOString(),
        },
      };

      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create auction');

      setNotice('New auction lot organized and published successfully!');
      setModalOpen(false);
      await fetchAuctions();
    } catch (err: any) {
      setError(err.message || 'Could not create auction');
    } finally {
      setSaving(false);
    }
  };

  // Quick 1-click extend auction duration
  const handleQuickExtend = async (auction: AuctionRecord, minutes: number) => {
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/auctions/${encodeURIComponent(auction.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendMinutes: minutes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend auction duration');
      const newEnd = data.auction?.schedule?.endsAt ? new Date(data.auction.schedule.endsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
      setNotice(`✓ Lot ${auction.auctionNumber} duration extended by +${minutes}m! New end time: ${newEnd}`);
      setTimeout(() => setNotice(''), 4500);
      await fetchAuctions();
    } catch (err: any) {
      setError(err.message || 'Could not extend auction duration');
    } finally {
      setSaving(false);
    }
  };

  // Custom modal extend duration handler
  const handleApplyCustomExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingAuction) return;
    setExtendingInFlight(true);
    setError('');
    try {
      let payload: any = {};
      if (extendTab === 'preset') {
        const mins = Number(customExtendMinutes) || 30;
        payload = { extendMinutes: mins };
      } else {
        if (!extendDateTimeInput) throw new Error('Please pick a valid future end date and time.');
        payload = { schedule: { endsAt: new Date(extendDateTimeInput).toISOString() } };
      }

      const res = await fetch(`/api/auctions/${encodeURIComponent(extendingAuction.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend auction');

      const newEnd = data.auction?.schedule?.endsAt ? new Date(data.auction.schedule.endsAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '';
      setNotice(`✓ Lot ${extendingAuction.auctionNumber} duration updated successfully! Ends at: ${newEnd}`);
      setExtendingAuction(null);
      setTimeout(() => setNotice(''), 4500);
      await fetchAuctions();
    } catch (err: any) {
      setError(err.message || 'Could not extend auction');
    } finally {
      setExtendingInFlight(false);
    }
  };

  // Declare winner / Close hammer
  const handleDeclareWinner = async (auction: AuctionRecord) => {
    if (!confirm(`Declare winner for Lot ${auction.auctionNumber}? Leading bid is ${formatINR(auction.pricing.currentBid)}.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/auctions/${encodeURIComponent(auction.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'declare_winner' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to declare winner');
      setNotice(`Winner declared for ${auction.auctionNumber}! Lot marked completed.`);
      await fetchAuctions();
    } catch (err: any) {
      alert(err.message || 'Error declaring winner');
    } finally {
      setLoading(false);
    }
  };

  // Delete auction
  const handleDeleteAuction = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete auction ${num}? This cannot be undone.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/auctions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete auction');
      setNotice(`Auction ${num} deleted.`);
      await fetchAuctions();
    } catch (err: any) {
      alert(err.message || 'Error deleting auction');
    } finally {
      setLoading(false);
    }
  };

  const filteredAuctions = auctions.filter(a => {
    if (filterType === 'all') return true;
    if (filterType === 'live') return a.status === 'live';
    if (filterType === 'upcoming') return a.status === 'upcoming';
    if (filterType === 'completed') return a.status === 'completed';
    if (filterType === 'offline') return a.auctionType === 'offline' || a.auctionType === 'hybrid';
    if (filterType === 'online') return a.auctionType === 'online';
    return true;
  });

  const liveCount = auctions.filter(a => a.status === 'live').length;
  const completedAuctions = auctions.filter(a => a.status === 'completed');
  const totalWinningVolume = completedAuctions.reduce((sum, a) => sum + (a.winner?.winningPrice || a.pricing.currentBid || 0), 0);
  const offlineCount = auctions.filter(a => a.auctionType === 'offline' || a.auctionType === 'hybrid').length;

  return (
    <div className="auction-manager-container" style={{ display: 'grid', gap: '22px' }}>
      {/* Header and KPI strip */}
      <div className="management-section-heading" style={{ margin: 0 }}>
        <div>
          <span className="eyebrow" style={{ color: '#2563eb', fontWeight: 800, letterSpacing: '0.08em' }}>
            B2B & PHYSICAL YARD AUCTION ENGINE
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 6px', color: '#0f172a' }}>
            Auction Management & Live Bidding
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Organize digital and physical yard car auctions in Junagadh, Rajkot, Ahmedabad, track live dealer bids, and declare hammer winners.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="management-secondary"
            onClick={fetchAuctions}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {(role === 'superadmin' || role === 'manager' || role === 'admin') && (
            <button
              type="button"
              className="management-primary"
              onClick={() => {
                setTitle('');
                void loadVehicleOptions();
                setModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#2563eb',
                color: '#fff',
                padding: '0 18px',
                minHeight: '42px',
                borderRadius: '10px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)'
              }}
            >
              <Plus size={16} />
              Organize Auction Lot
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}>✕</button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Live Bidding Lots</span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px #dcfce7' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{liveCount}</div>
          <small style={{ color: '#16a34a', fontWeight: 600, fontSize: '11px' }}>Active in market right now</small>
        </div>

        <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Offline Yard Lots</span>
            <Building2 size={16} color="#6366f1" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{offlineCount}</div>
          <small style={{ color: '#6366f1', fontWeight: 600, fontSize: '11px' }}>Junagadh & Gujarat Hubs</small>
        </div>

        <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Concluded Auctions</span>
            <Trophy size={16} color="#eab308" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{completedAuctions.length}</div>
          <small style={{ color: '#b45309', fontWeight: 600, fontSize: '11px' }}>With verified winners</small>
        </div>

        <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Winning Volume</span>
            <TrendingUp size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{formatINR(totalWinningVolume)}</div>
          <small style={{ color: '#059669', fontWeight: 600, fontSize: '11px' }}>Auction hammer settlements</small>
        </div>
      </div>

      {/* Filter Tabs - Horizontal Touch Scroller on Mobile */}
      <div className="auction-filter-tabs-scroller">
        {[
          { id: 'all', label: `All Lots (${auctions.length})` },
          { id: 'live', label: `Live Now (${liveCount})` },
          { id: 'offline', label: `Physical Yard (${offlineCount})` },
          { id: 'online', label: 'Online Only' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'completed', label: `Completed Winners (${completedAuctions.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id as any)}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: filterType === tab.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: filterType === tab.id ? '#eff6ff' : '#ffffff',
              color: filterType === tab.id ? '#1d4ed8' : '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Auctions Table / Cards */}
      {filteredAuctions.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <Gavel size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', margin: '0 0 6px' }}>No auction lots match this filter</h3>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Create a new lot or switch filters to view existing live or concluded auctions.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {filteredAuctions.map(auction => {
            const isLive = auction.status === 'live';
            const isCompleted = auction.status === 'completed';
            const isOffline = auction.auctionType === 'offline' || auction.auctionType === 'hybrid';
            const leadingBid = auction.bids.find(b => b.isLeading) || auction.bids[0];

            return (
              <div
                key={auction.id}
                className="auction-manager-lot-card"
                style={{
                  background: '#ffffff',
                  border: isLive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  boxShadow: isLive ? '0 8px 24px rgba(59, 130, 246, 0.08)' : '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                {/* Vehicle Thumbnail */}
                <div style={{ position: 'relative', width: '140px', height: '100px', borderRadius: '10px', overflow: 'hidden', background: '#f1f5f9' }}>
                  <img
                    src={auction.vehicle.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'}
                    alt={`${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      padding: '3px 7px',
                      borderRadius: '6px',
                      fontSize: '9px',
                      fontWeight: 800,
                      background: isLive ? '#22c55e' : isCompleted ? '#64748b' : '#3b82f6',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}
                  >
                    {auction.status}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 700,
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#fff'
                    }}
                  >
                    Score: {auction.vehicle.conditionScore}/100
                  </span>
                </div>

                {/* Car & Auction Meta */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                      {auction.auctionNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isOffline ? '#fef3c7' : '#f0fdf4',
                        color: isOffline ? '#92400e' : '#166534',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {isOffline ? <MapPin size={11} /> : <Sparkles size={11} />}
                      {isOffline ? `OFFLINE YARD (${auction.venue?.city || 'Junagadh'})` : 'ONLINE DIGITAL'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 4px', color: '#0f172a' }}>
                    {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}
                  </h3>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b' }}>
                    {auction.vehicle.variant} • {auction.vehicle.fuel} • {auction.vehicle.transmission} • {auction.vehicle.km.toLocaleString('en-IN')} km
                  </p>

                  {isOffline && auction.venue && (
                    <div style={{ fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>📍 {auction.venue.name}</span>
                      <span>{auction.venue.address}, {auction.venue.city} ({auction.venue.pincode})</span>
                      {auction.venue.gateEntryTiming && (
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>⏰ {auction.venue.gateEntryTiming}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bidding Metrics & Winner */}
                <div>
                  {isCompleted && auction.winner ? (
                    <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '10px 14px', borderRadius: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trophy size={13} color="#ca8a04" /> AUCTION WINNER DECLARED
                      </span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#713f12', margin: '3px 0' }}>
                        {formatINR(auction.winner.winningPrice)}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                        {auction.winner.dealerName || auction.winner.name}
                      </div>
                      <small style={{ fontSize: '11px', color: '#64748b' }}>
                        📞 {auction.winner.phone} • {new Date(auction.winner.completedAt).toLocaleDateString('en-IN')}
                      </small>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Current Leading Bid
                      </span>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0 4px' }}>
                        {formatINR(auction.pricing.currentBid)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700 }}>{auction.pricing.totalBids} bids</span>
                        <span>•</span>
                        <span>Min Increment: {formatINR(auction.pricing.minIncrement)}</span>
                      </div>
                      {leadingBid && (
                        <div style={{ marginTop: '5px', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                          🏆 Leader: {leadingBid.bidderName}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Schedule & Live Timer Strip */}
                  {(() => {
                    const timerInfo = getRemainingTimeText(auction.schedule?.endsAt, auction.status);
                    return (
                      <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock3 size={12} color="#2563eb" />
                            {isCompleted ? 'Ended' : isLive ? 'Live Timer' : 'Scheduled'}
                          </span>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: timerInfo.color }}>
                            {timerInfo.text}
                          </span>
                        </div>
                        {auction.schedule?.endsAt && (
                          <small style={{ fontSize: '9.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                            Ends: {new Date(auction.schedule.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(auction.schedule.endsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({auction.schedule?.durationMinutes || 120}m)
                          </small>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
                  <a
                    href="/dealer-auctions"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#2563eb',
                      textDecoration: 'none'
                    }}
                  >
                    View on Live Auction Page <ExternalLink size={12} />
                  </a>

                  {/* Extend Duration Box */}
                  {(role === 'superadmin' || role === 'manager' || role === 'admin') && (
                    <div style={{ width: '100%', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock3 size={12} color="#ea580c" /> Extend Duration
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setExtendingAuction(auction);
                            setCustomExtendMinutes('30');
                            setExtendDateTimeInput('');
                            setExtendTab('preset');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '10.5px',
                            fontWeight: 750,
                            color: '#ea580c',
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline'
                          }}
                          title="Open custom duration / date-time picker"
                        >
                          Custom…
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                        {[
                          { label: '+15m', mins: 15 },
                          { label: '+30m', mins: 30 },
                          { label: '+1h', mins: 60 },
                          { label: '+2h', mins: 120 },
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            disabled={saving}
                            onClick={() => handleQuickExtend(auction, preset.mins)}
                            title={`Add +${preset.mins} minutes immediately`}
                            style={{
                              padding: '5px 0',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              background: '#ffffff',
                              border: '1px solid #fdba74',
                              borderRadius: '5px',
                              color: '#c2410c',
                              cursor: saving ? 'wait' : 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLive && (role === 'superadmin' || role === 'manager' || role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleDeclareWinner(auction)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#16a34a',
                        color: '#fff',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trophy size={14} />
                      Declare Winner
                    </button>
                  )}

                  {(role === 'superadmin' || role === 'manager') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAuction(auction.id, auction.auctionNumber)}
                      style={{
                        padding: '6px 10px',
                        background: '#fff',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={12} />
                      Remove Lot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Organize Auction Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
                  SUPERADMIN / DEALER AUCTION DESK
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
                  Organize New Car Auction Lot
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAuction} style={{ display: 'grid', gap: '16px' }}>
              {/* Quick Auto-Fill Vehicle Selector */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <b style={{ fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} color="#16a34a" />
                    Quick Import Vehicle from Inventory or Sell Requests
                  </b>
                  <small style={{ color: '#15803d', fontSize: '11px' }}>
                    {loadingOptions ? 'Fetching vehicles…' : 'Optional · Auto-fills all vehicle fields'}
                  </small>
                </div>
                <select
                  value={selectedVehicleOption}
                  onChange={handleSelectVehicleOption}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    background: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Choose vehicle to auto-populate (or type manually below) --</option>
                  {inventoryOptions.length > 0 && (
                    <optgroup label="Marketplace Inventory (cars collection)">
                      {inventoryOptions.map((item: any) => (
                        <option key={`inv-${item.id}`} value={`inv:${item.id}`}>
                          🚗 {item.year} {item.make} {item.model} {item.variant ? `(${item.variant})` : ''} · ₹{Math.round(item.price || 0).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {inquiryOptions.length > 0 && (
                    <optgroup label="Sell Car Inquiries (sellInquiries collection)">
                      {inquiryOptions.map((item: any) => (
                        <option key={`inq-${item.id}`} value={`inq:${item.id}`}>
                          📋 {item.vehicle?.year || item.year} {item.vehicle?.make || item.make} {item.vehicle?.model || item.model} [{item.inquiryNumber}] · Expected ₹{Math.round(item.expectedPrice || item.estimatedLow || 0).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {(linkedCarId || linkedInquiryId) && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#15803d' }}>
                    <CheckCircle2 size={13} />
                    <span>
                      Vehicle linked to <b>{linkedCarId ? `Inventory Car #${linkedCarId}` : `Sell Request #${linkedInquiryId}`}</b>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearVehicleLink}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                    >
                      Clear link
                    </button>
                  </div>
                )}
              </div>

              {/* Auction Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Auction Mode / Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'offline', label: 'Offline Physical Yard', desc: 'Junagadh / Rajkot delivery hub inspection & live hammer' },
                    { id: 'online', label: 'Online Digital', desc: '100% remote digital countdown & bidding' },
                    { id: 'hybrid', label: 'Hybrid (Yard + Online)', desc: 'Inspect at yard, bid in person or online' },
                  ].map(mode => (
                    <div
                      key={mode.id}
                      onClick={() => setAuctionType(mode.id as any)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: auctionType === mode.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: auctionType === mode.id ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <b style={{ display: 'block', fontSize: '12px', color: auctionType === mode.id ? '#1e40af' : '#1e293b' }}>
                        {mode.label}
                      </b>
                      <small style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                        {mode.desc}
                      </small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offline Venue Details (if offline/hybrid) */}
              {(auctionType === 'offline' || auctionType === 'hybrid') && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'grid', gap: '12px' }}>
                  <b style={{ fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#2563eb" />
                    Physical Yard Venue & Gate Entry Details (Default Junagadh)
                  </b>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Venue / Yard Name
                      <input
                        required
                        type="text"
                        value={venueName}
                        onChange={e => setVenueName(e.target.value)}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                      />
                    </label>

                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      City (Primary: Junagadh)
                      <select
                        value={venueCity}
                        onChange={e => {
                          setVenueCity(e.target.value);
                          if (e.target.value === 'Junagadh') setVenuePincode('362001');
                          if (e.target.value === 'Rajkot') setVenuePincode('360001');
                          if (e.target.value === 'Ahmedabad') setVenuePincode('380001');
                        }}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                      >
                        <option value="Junagadh">Junagadh (Default HQ)</option>
                        <option value="Rajkot">Rajkot</option>
                        <option value="Ahmedabad">Ahmedabad</option>
                        <option value="Gondal">Gondal</option>
                        <option value="Jetpur">Jetpur</option>
                        <option value="Morbi">Morbi</option>
                        <option value="Jamnagar">Jamnagar</option>
                        <option value="Bhavnagar">Bhavnagar</option>
                      </select>
                    </label>
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Full Yard Address
                    <input
                      required
                      type="text"
                      value={venueAddress}
                      onChange={e => setVenueAddress(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Pincode
                      <input
                        required
                        type="text"
                        value={venuePincode}
                        onChange={e => setVenuePincode(e.target.value)}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                      />
                    </label>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Landmark
                      <input
                        type="text"
                        value={venueLandmark}
                        onChange={e => setVenueLandmark(e.target.value)}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                      />
                    </label>
                  </div>

                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Gate Entry & Vehicle Inspection Timing
                    <input
                      required
                      type="text"
                      value={gateTiming}
                      onChange={e => setGateTiming(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Yard Coordinator Name
                      <input
                        required
                        type="text"
                        value={coordinatorName}
                        onChange={e => setCoordinatorName(e.target.value)}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                      />
                    </label>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Coordinator Phone Number
                      <input
                        required
                        type="text"
                        value={coordinatorPhone}
                        onChange={e => setCoordinatorPhone(e.target.value)}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Vehicle Specs */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'grid', gap: '12px' }}>
                <b style={{ fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CarFront size={14} color="#2563eb" />
                  Vehicle Information & Verification
                </b>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Make / Brand
                    <input
                      required
                      type="text"
                      value={make}
                      onChange={e => setMake(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Model
                    <input
                      required
                      type="text"
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Year
                    <input
                      required
                      type="number"
                      min={2015}
                      max={2026}
                      value={year}
                      onChange={e => setYear(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Variant
                    <input
                      required
                      type="text"
                      value={variant}
                      onChange={e => setVariant(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Registration No.
                    <input
                      required
                      type="text"
                      value={registration}
                      onChange={e => setRegistration(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Condition Score (0-100)
                    <input
                      required
                      type="number"
                      min={50}
                      max={100}
                      value={conditionScore}
                      onChange={e => setConditionScore(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Odometer (km)
                    <input
                      required
                      type="number"
                      value={km}
                      onChange={e => setKm(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Fuel
                    <select
                      value={fuel}
                      onChange={e => setFuel(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="CNG">CNG</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Transmission
                    <select
                      value={transmission}
                      onChange={e => setTransmission(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    >
                      <option value="Manual">Manual</option>
                      <option value="Automatic">Automatic</option>
                    </select>
                  </label>
                </div>

                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  Vehicle Photo URL
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                  />
                  {imageUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                      <img
                        src={imageUrl}
                        alt="Vehicle preview"
                        style={{ width: '56px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        onClick={() => setAdjustingAuctionPhoto(true)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #2563eb',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Crop size={13} /> Preview on Website &amp; Adjust Framing
                      </button>
                    </div>
                  )}
                </label>
              </div>

              {/* Pricing & Timing */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'grid', gap: '12px' }}>
                <b style={{ fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color="#2563eb" />
                  Pricing & Auction Duration
                </b>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Starting Price (₹)
                    <input
                      required
                      type="number"
                      step={5000}
                      value={startingPrice}
                      onChange={e => setStartingPrice(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Reserve Price (₹)
                    <input
                      required
                      type="number"
                      step={5000}
                      value={reservePrice}
                      onChange={e => setReservePrice(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Min Increment (₹)
                    <input
                      required
                      type="number"
                      step={1000}
                      value={minIncrement}
                      onChange={e => setMinIncrement(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                    />
                  </label>
                </div>

                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  Duration of Bidding (Minutes)
                  <select
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px' }}
                  >
                    <option value={30}>30 Minutes Flash Bidding</option>
                    <option value={60}>1 Hour Standard</option>
                    <option value={120}>2 Hours (Recommended for Yard Lots)</option>
                    <option value={240}>4 Hours Extended Session</option>
                    <option value={1440}>24 Hours Full Day</option>
                  </select>
                </label>
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '0 18px',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0 24px',
                    height: '42px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)'
                  }}
                >
                  {saving ? 'Publishing Lot...' : 'Organize & Publish Auction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Duration Modal */}
      {extendingAuction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock3 size={13} color="#ea580c" /> AUCTION LOT DURATION CONTROLS
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
                  Extend Auction Duration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExtendingAuction(null)}
                style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            {/* Vehicle & Schedule Info Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <b style={{ fontSize: '13px', color: '#0f172a' }}>
                  {extendingAuction.vehicle.year} {extendingAuction.vehicle.make} {extendingAuction.vehicle.model}
                </b>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                  {extendingAuction.auctionNumber}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#475569', marginTop: '8px' }}>
                <div>
                  <small style={{ color: '#94a3b8', display: 'block' }}>Current Status</small>
                  <b style={{ textTransform: 'uppercase', color: extendingAuction.status === 'live' ? '#16a34a' : '#64748b' }}>
                    {extendingAuction.status}
                  </b>
                </div>
                <div>
                  <small style={{ color: '#94a3b8', display: 'block' }}>Current End Time</small>
                  <b>
                    {new Date(extendingAuction.schedule.endsAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, {new Date(extendingAuction.schedule.endsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </b>
                </div>
              </div>
            </div>

            <form onSubmit={handleApplyCustomExtension} style={{ display: 'grid', gap: '14px' }}>
              {/* Tab Selector: Minutes Preset vs Specific Datetime */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setExtendTab('preset')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: extendTab === 'preset' ? '#ffffff' : 'transparent',
                    color: extendTab === 'preset' ? '#0f172a' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: extendTab === 'preset' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Add Minutes / Hours
                </button>
                <button
                  type="button"
                  onClick={() => setExtendTab('datetime')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: extendTab === 'datetime' ? '#ffffff' : 'transparent',
                    color: extendTab === 'datetime' ? '#0f172a' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: extendTab === 'datetime' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Pick Specific Date & Time
                </button>
              </div>

              {extendTab === 'preset' ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                    Select Duration Extension Preset
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { label: '+15 Mins', mins: 15 },
                      { label: '+30 Mins', mins: 30 },
                      { label: '+45 Mins', mins: 45 },
                      { label: '+1 Hour', mins: 60 },
                      { label: '+2 Hours', mins: 120 },
                      { label: '+4 Hours', mins: 240 },
                      { label: '+12 Hours', mins: 720 },
                      { label: '+24 Hours', mins: 1440 },
                    ].map(p => {
                      const isSelected = Number(customExtendMinutes) === p.mins;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setCustomExtendMinutes(String(p.mins))}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #ea580c' : '1px solid #e2e8f0',
                            background: isSelected ? '#fff7ed' : '#f8fafc',
                            color: isSelected ? '#c2410c' : '#334155',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Or Type Custom Minutes
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10080"
                      value={customExtendMinutes}
                      onChange={e => setCustomExtendMinutes(e.target.value)}
                      placeholder="e.g. 45"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    New Auction End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={extendDateTimeInput}
                    onChange={e => setExtendDateTimeInput(e.target.value)}
                    required={extendTab === 'datetime'}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    Select when the hammer should drop and bidding officially concludes.
                  </small>
                </div>
              )}

              {/* Submit / Cancel Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setExtendingAuction(null)}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extendingInFlight}
                  style={{
                    flex: 2,
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: extendingInFlight ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={15} />
                  {extendingInFlight ? 'Extending Duration…' : 'Confirm & Extend Duration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Website Preview & Framing Adjuster for Auction Vehicle */}
      {adjustingAuctionPhoto && imageUrl && (
        <VehicleImageAdjuster
          isModal
          imageUrl={imageUrl}
          carInfo={{
            make,
            model,
            variant,
            year,
            price: startingPrice,
            city: venueCity,
            badge: 'Live Auction'
          }}
          onApply={handleApplyAuctionCrop}
          onClose={() => setAdjustingAuctionPhoto(false)}
        />
      )}
    </div>
  );
}

