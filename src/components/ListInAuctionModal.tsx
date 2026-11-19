'use client';

import { useState, useEffect, useId } from 'react';
import {
  Gavel,
  X,
  Building2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  CarFront,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import type { AuctionRecord } from '@/app/api/auctions/route';

function formatINR(val: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

export type AuctionVehicleInput = {
  carId?: string;
  inquiryId?: string;
  sourceType: 'inventory' | 'sell_inquiry';
  make: string;
  model: string;
  variant?: string;
  year: number;
  registration?: string;
  km?: number;
  fuel?: string;
  transmission?: string;
  price?: number;
  city?: string;
  conditionScore?: number;
  image?: string;
  photoIds?: string[];
  rcVerified?: boolean;
  sellerName?: string;
};

const PRESET_YARDS = [
  {
    name: 'Cars21 Central Yard & Delivery Hub',
    address: 'Plot No. 12/B, Junagadh-Rajkot National Highway, Near Bhesan Cross Road',
    city: 'Junagadh',
    state: 'Gujarat',
    pincode: '362001',
    landmark: 'Opposite Agricultural University Research Farm',
    coordinatorName: 'Kishorebhai Bhalodia',
    coordinatorPhone: '+91 98251 44556',
    gateTiming: '09:30 AM to 11:30 AM Inspection. Live Hammer starts at 12:00 PM',
  },
  {
    name: 'Cars21 West Ahmedabad Auction Yard',
    address: 'S.G. Highway, Near Vaishnodevi Circle, Gota',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382421',
    landmark: 'Behind Nirma University Sports Complex',
    coordinatorName: 'Hardik Patel',
    coordinatorPhone: '+91 98982 33445',
    gateTiming: '10:00 AM Gate Entry. Physical verification till 12:30 PM.',
  },
  {
    name: 'Cars21 Rajkot Yard 1',
    address: 'Gondal Road National Highway, Near Kothariya Ring Road',
    city: 'Rajkot',
    state: 'Gujarat',
    pincode: '360004',
    landmark: 'Opposite Shapar Industrial Zone Gate 2',
    coordinatorName: 'Paresh Vaghasiya',
    coordinatorPhone: '+91 98242 11223',
    gateTiming: '10:00 AM Yard Gate opens for registered B2B dealers.',
  },
];

export function ListInAuctionModal({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  vehicle: AuctionVehicleInput;
  onSuccess?: (auction: AuctionRecord) => void;
}) {
  const modalTitleId = useId();
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [existingAuctions, setExistingAuctions] = useState<AuctionRecord[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');

  // New Auction Form States
  const [auctionType, setAuctionType] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const defaultCity = vehicle.city || 'Junagadh';
  const [selectedYardIndex, setSelectedYardIndex] = useState<number>(0);
  const [title, setTitle] = useState(
    `${defaultCity} ${vehicle.year} ${vehicle.make} ${vehicle.model} B2B Yard Auction`
  );

  // Pricing
  const basePrice = vehicle.price || 500000;
  const [startingPrice, setStartingPrice] = useState<number>(Math.round(basePrice * 0.8));
  const [reservePrice, setReservePrice] = useState<number>(basePrice);
  const [minIncrement, setMinIncrement] = useState<number>(10000);

  // Schedule
  const [scheduleOption, setScheduleOption] = useState<'now' | 'tomorrow' | 'custom'>('now');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [customStart, setCustomStart] = useState<string>('');

  // Status & Notifications
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successAuction, setSuccessAuction] = useState<AuctionRecord | null>(null);

  // Fetch existing auctions for Tab 2
  useEffect(() => {
    if (!isOpen) return;
    async function loadExisting() {
      try {
        setLoadingExisting(true);
        const res = await fetch('/api/auctions', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.auctions) {
          const openList = (data.auctions as AuctionRecord[]).filter(
            a => a.status === 'live' || a.status === 'upcoming'
          );
          setExistingAuctions(openList);
          if (openList.length > 0) setSelectedExistingId(openList[0].id);
        }
      } catch (e) {
        console.error('Failed to load existing auctions', e);
      } finally {
        setLoadingExisting(false);
      }
    }
    loadExisting();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentYard = PRESET_YARDS[selectedYardIndex] || PRESET_YARDS[0];

  const handleCreateNewAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      let startsAtDate = new Date();
      if (scheduleOption === 'tomorrow') {
        startsAtDate = new Date();
        startsAtDate.setDate(startsAtDate.getDate() + 1);
        startsAtDate.setHours(10, 0, 0, 0);
      } else if (scheduleOption === 'custom' && customStart) {
        startsAtDate = new Date(customStart);
      }

      const payload = {
        title: title.trim() || `${currentYard.city} ${vehicle.year} ${vehicle.make} ${vehicle.model} Auction`,
        auctionType,
        venue: (auctionType === 'offline' || auctionType === 'hybrid') ? {
          name: currentYard.name,
          address: currentYard.address,
          city: currentYard.city,
          state: currentYard.state,
          pincode: currentYard.pincode,
          landmark: currentYard.landmark,
          gateEntryTiming: currentYard.gateTiming,
          coordinatorName: currentYard.coordinatorName,
          coordinatorPhone: currentYard.coordinatorPhone,
        } : undefined,
        vehicle: {
          carId: vehicle.carId || undefined,
          inquiryId: vehicle.inquiryId || undefined,
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant || 'Standard',
          year: Number(vehicle.year),
          registration: (vehicle.registration || 'UNREGISTERED').toUpperCase(),
          km: Number(vehicle.km || 0),
          fuel: vehicle.fuel || 'Petrol',
          transmission: vehicle.transmission || 'Manual',
          city: currentYard.city || vehicle.city || 'Junagadh',
          conditionScore: Number(vehicle.conditionScore || 90),
          image: vehicle.image || '/images/kars21-hero.png',
          photoIds: vehicle.photoIds || [],
          rcVerified: vehicle.rcVerified !== false,
        },
        pricing: {
          startingPrice: Number(startingPrice),
          reservePrice: Number(reservePrice),
          minIncrement: Number(minIncrement),
        },
        schedule: {
          startsAt: startsAtDate.toISOString(),
          durationMinutes: Number(durationMinutes),
        },
      };

      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to organize auction lot');

      setSuccessAuction(data.auction);
      if (onSuccess) onSuccess(data.auction);
    } catch (err: any) {
      setError(err.message || 'Unable to create auction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignToExistingAuction = async () => {
    if (!selectedExistingId) {
      setError('Please select an active or upcoming auction lot.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const selectedAuction = existingAuctions.find(a => a.id === selectedExistingId);
      const payload = {
        vehicle: {
          carId: vehicle.carId || undefined,
          inquiryId: vehicle.inquiryId || undefined,
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant || 'Standard',
          year: Number(vehicle.year),
          registration: (vehicle.registration || 'UNREGISTERED').toUpperCase(),
          km: Number(vehicle.km || 0),
          fuel: vehicle.fuel || 'Petrol',
          transmission: vehicle.transmission || 'Manual',
          city: selectedAuction?.venue?.city || vehicle.city || 'Junagadh',
          conditionScore: Number(vehicle.conditionScore || 90),
          image: vehicle.image || '/images/kars21-hero.png',
          photoIds: vehicle.photoIds || [],
          rcVerified: vehicle.rcVerified !== false,
        },
      };

      const res = await fetch(`/api/auctions/${encodeURIComponent(selectedExistingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign vehicle to auction.');

      setSuccessAuction(data.auction);
      if (onSuccess) onSuccess(data.auction);
    } catch (err: any) {
      setError(err.message || 'Unable to assign car to auction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="lead-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="lead-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '680px',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        {/* Top Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                background: '#ca8a04',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Gavel size={11} /> B2B AUCTION DESK
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {vehicle.sourceType === 'sell_inquiry' ? 'From Sell Inquiry Request' : 'From Inventory Listing'}
            </span>
          </div>

          <h2 id={modalTitleId} style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
            List Vehicle in Auction
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
            Organize a physical yard hammer event or fast digital bidding session for verified dealer networks.
          </p>
        </div>

        {/* Vehicle Identity Strip */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '52px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#0f172a',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {vehicle.image ? (
              <img
                src={vehicle.image}
                alt={`${vehicle.year} ${vehicle.make}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <CarFront size={22} color="#94a3b8" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </strong>
              {vehicle.variant && (
                <span style={{ fontSize: '12px', color: '#64748b' }}>{vehicle.variant}</span>
              )}
              {vehicle.rcVerified && (
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <ShieldCheck size={11} /> RC Verified
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
              <span>{vehicle.registration || 'Reg Pending'}</span>
              <span>•</span>
              <span>{(vehicle.km || 0).toLocaleString('en-IN')} km</span>
              <span>•</span>
              <span>{vehicle.fuel || 'Petrol'}</span>
              <span>•</span>
              <span>{vehicle.transmission || 'Manual'}</span>
              <span>•</span>
              <span>{vehicle.city || 'Junagadh'}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <small style={{ display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Base Value
            </small>
            <b style={{ fontSize: '16px', color: '#0f172a' }}>{formatINR(vehicle.price || 0)}</b>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#991b1b',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successAuction ? (
            /* Success State */
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                Vehicle Listed in Auction!
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Lot <b>{successAuction.auctionNumber}</b> is now created and linked with{' '}
                <b>{vehicle.year} {vehicle.make} {vehicle.model}</b>. Authorized dealers can inspect details and place bids.
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  maxWidth: '420px',
                  margin: '0 auto 24px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>Auction Format:</span>
                  <b style={{ fontSize: '11.5px', color: '#0f172a', textTransform: 'capitalize' }}>
                    {successAuction.auctionType} Auction
                  </b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>Starting Bid:</span>
                  <b style={{ fontSize: '11.5px', color: '#0f172a' }}>{formatINR(successAuction.pricing.startingPrice)}</b>
                </div>
                {successAuction.venue?.city && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Yard Location:</span>
                    <b style={{ fontSize: '11.5px', color: '#0f172a' }}>{successAuction.venue.city}</b>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href="/dealer-auctions"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} /> Open Live Bidding Screen
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Selection Tabs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === 'new' ? '#ffffff' : 'transparent',
                    color: activeTab === 'new' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'new' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Sparkles size={14} color={activeTab === 'new' ? '#2563eb' : 'currentColor'} />
                  <span>Create New Auction</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('existing')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === 'existing' ? '#ffffff' : 'transparent',
                    color: activeTab === 'existing' ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === 'existing' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Gavel size={14} color={activeTab === 'existing' ? '#ca8a04' : 'currentColor'} />
                  <span>Select Existing Auction ({existingAuctions.length})</span>
                </button>
              </div>

              {activeTab === 'new' ? (
                /* TAB 1: CREATE NEW AUCTION */
                <form onSubmit={handleCreateNewAuction}>
                  {/* Format Pills */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Select Auction Format
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { type: 'offline' as const, label: 'Physical Yard', desc: 'Inspection + Live Hammer' },
                        { type: 'online' as const, label: 'Online Digital', desc: 'Real-time Portal Bids' },
                        { type: 'hybrid' as const, label: 'Hybrid Format', desc: 'Yard + Online Synced' },
                      ].map(item => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setAuctionType(item.type);
                            setTitle(`${currentYard.city} ${vehicle.year} ${vehicle.make} ${vehicle.model} ${item.type === 'offline' ? 'Yard' : 'Digital'} Auction`);
                          }}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            border: `2px solid ${auctionType === item.type ? '#2563eb' : '#e2e8f0'}`,
                            background: auctionType === item.type ? '#eff6ff' : '#ffffff',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <b style={{ display: 'block', fontSize: '12px', color: auctionType === item.type ? '#1d4ed8' : '#0f172a' }}>
                            {item.label}
                          </b>
                          <small style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                            {item.desc}
                          </small>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Auction Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Junagadh 2023 Hyundai Creta Yard Auction"
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        padding: '0 12px',
                        fontSize: '13px',
                        color: '#0f172a',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Physical Yard Venue (if offline/hybrid) */}
                  {(auctionType === 'offline' || auctionType === 'hybrid') && (
                    <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        Physical Yard Venue & Regional Hub
                      </label>
                      <select
                        value={selectedYardIndex}
                        onChange={e => {
                          const idx = Number(e.target.value);
                          setSelectedYardIndex(idx);
                          const y = PRESET_YARDS[idx];
                          if (y) {
                            setTitle(`${y.city} ${vehicle.year} ${vehicle.make} ${vehicle.model} ${auctionType === 'offline' ? 'Yard' : 'Digital'} Auction`);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '0 10px',
                          fontSize: '12.5px',
                          color: '#0f172a',
                          background: '#ffffff',
                          marginBottom: '8px',
                        }}
                      >
                        {PRESET_YARDS.map((y, idx) => (
                          <option key={y.name} value={idx}>
                            {y.name} ({y.city})
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                        <div><b>Address:</b> {currentYard.address}</div>
                        <div><b>Gate Timing:</b> {currentYard.gateTiming}</div>
                        <div><b>Yard Coordinator:</b> {currentYard.coordinatorName} ({currentYard.coordinatorPhone})</div>
                      </div>
                    </div>
                  )}

                  {/* Pricing Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Starting Price (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min={10000}
                        step={5000}
                        value={startingPrice}
                        onChange={e => setStartingPrice(Number(e.target.value))}
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '0 10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Reserve Price (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min={10000}
                        step={5000}
                        value={reservePrice}
                        onChange={e => setReservePrice(Number(e.target.value))}
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '0 10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Min Increment (₹)
                      </label>
                      <select
                        value={minIncrement}
                        onChange={e => setMinIncrement(Number(e.target.value))}
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '0 8px',
                          fontSize: '12.5px',
                          color: '#0f172a',
                          background: '#ffffff',
                        }}
                      >
                        <option value={5000}>₹5,000</option>
                        <option value={10000}>₹10,000</option>
                        <option value={20000}>₹20,000</option>
                        <option value={25000}>₹25,000</option>
                        <option value={50000}>₹50,000</option>
                      </select>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Start Schedule
                      </label>
                      <select
                        value={scheduleOption}
                        onChange={e => setScheduleOption(e.target.value as any)}
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '0 10px',
                          fontSize: '12.5px',
                          color: '#0f172a',
                          background: '#ffffff',
                          marginBottom: scheduleOption === 'custom' ? '8px' : '0',
                        }}
                      >
                        <option value="now">Start Immediately (Live Now)</option>
                        <option value="tomorrow">Tomorrow at 10:00 AM</option>
                        <option value="custom">Custom Date & Time</option>
                      </select>
                      {scheduleOption === 'custom' && (
                        <input
                          type="datetime-local"
                          required
                          value={customStart}
                          onChange={e => setCustomStart(e.target.value)}
                          style={{
                            width: '100%',
                            height: '36px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            padding: '0 8px',
                            fontSize: '12px',
                          }}
                        />
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Session Duration
                      </label>
                      <select
                        value={durationMinutes}
                        onChange={e => setDurationMinutes(Number(e.target.value))}
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '0 10px',
                          fontSize: '12.5px',
                          color: '#0f172a',
                          background: '#ffffff',
                        }}
                      >
                        <option value={60}>60 Minutes (Fast Hammer)</option>
                        <option value={120}>120 Minutes (Standard 2 Hrs)</option>
                        <option value={240}>4 Hours</option>
                        <option value={1440}>24 Hours (Full Day Window)</option>
                        <option value={4320}>3 Days (Weekend Event)</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 22px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      <Gavel size={15} />
                      {submitting ? 'Organizing Auction…' : 'Create & Launch Auction'}
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB 2: ADD TO EXISTING OPEN AUCTION */
                <div>
                  <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#64748b' }}>
                    Select an active or upcoming auction lot from your schedule to assign this vehicle:
                  </p>

                  {loadingExisting ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      Loading open auctions…
                    </div>
                  ) : existingAuctions.length === 0 ? (
                    <div
                      style={{
                        padding: '30px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px dashed #cbd5e1',
                        color: '#64748b',
                      }}
                    >
                      <Gavel size={26} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                      <b style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>
                        No Open Auctions Found
                      </b>
                      <span style={{ fontSize: '12px', display: 'block', margin: '4px 0 12px' }}>
                        There are currently no active or upcoming auctions scheduled.
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('new')}
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Create a New Auction Lot
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {existingAuctions.map(auc => {
                        const isSelected = selectedExistingId === auc.id;
                        return (
                          <div
                            key={auc.id}
                            onClick={() => setSelectedExistingId(auc.id)}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '12px',
                              border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span
                                  style={{
                                    background: auc.status === 'live' ? '#ef4444' : '#f59e0b',
                                    color: '#ffffff',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {auc.status === 'live' ? '● LIVE NOW' : 'UPCOMING'}
                                </span>
                                <span
                                  style={{
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                  }}
                                >
                                  {auc.auctionNumber}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  {auc.auctionType === 'offline' ? 'Yard Hammer' : auc.auctionType === 'hybrid' ? 'Hybrid' : 'Online Digital'}
                                </span>
                              </div>
                              <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block' }}>
                                {auc.title}
                              </strong>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Current Lot: {auc.vehicle.year} {auc.vehicle.make} {auc.vehicle.model} • Current Bid: {formatINR(auc.pricing.currentBid)}
                                {auc.venue?.city ? ` • ${auc.venue.city} Yard` : ''}
                              </div>
                            </div>

                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                border: `2px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                                background: isSelected ? '#2563eb' : 'transparent',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && <Check size={13} color="#ffffff" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {existingAuctions.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAssignToExistingAuction}
                        disabled={submitting || !selectedExistingId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 22px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#ca8a04',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.7 : 1,
                        }}
                      >
                        <Gavel size={15} />
                        {submitting ? 'Assigning Vehicle…' : 'Assign to Selected Auction'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
