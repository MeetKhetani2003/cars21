'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  CarFront, ShieldCheck, CheckCircle2, XCircle, Clock,
  Search, Phone, Mail, MapPin, ExternalLink, FileText,
  User, ChevronRight, AlertCircle, Check, RefreshCw, Trash2,
  DollarSign, Calendar, Eye, Image as ImageIcon, MessageCircle,
  Camera, CheckCheck, Sparkles, Building2, ArrowUpRight, X
} from 'lucide-react';
import { formatINR } from '../data';

export type SellInquiry = {
  id: string;
  inquiryNumber: string;
  userId?: string | null;
  seller: {
    name: string;
    phone: string;
    email?: string;
    city: string;
    state?: string;
    pincode?: string;
    address?: string;
  };
  vehicle: {
    make: string;
    model: string;
    variant?: string;
    registration: string;
    purchaseYear: number;
    mfgYear: number;
    owners: number;
    km: number;
    fuel: string;
    transmission: string;
    condition: string;
    color?: string;
    bodyType?: string;
    insuranceValidity?: string;
    accidentalHistory?: string;
    serviceHistory?: string;
  };
  pricing: {
    expectedPrice: number;
    estimatedMarketValue?: number;
    counterOffer?: number;
    sellingTimeline?: string;
  };
  media: {
    photoFrontId?: string;
    photoBackId?: string;
    photoLeftSideId?: string;
    photoRightSideId?: string;
    photoInteriorId?: string;
    additionalPhotoIds?: string[];
  };
  documents: {
    rcBookPhotoId?: string;
    insurancePhotoId?: string;
    verificationStatus: 'unverified' | 'under_verification' | 'verified' | 'rejected';
    verificationNotes?: string;
  };
  status: 'new' | 'contacted' | 'inspection_scheduled' | 'price_negotiated' | 'purchased' | 'rejected';
  adminNotes?: string;
  assignedAdminName?: string;
  createdAt: string;
  updatedAt: string;
};

type SellInquiryMetrics = {
  total: number;
  new: number;
  contacted: number;
  inspectionScheduled: number;
  priceNegotiated: number;
  purchased: number;
  rejected: number;
  verifiedRc: number;
  totalExpectedVolume: number;
};

export function SellInquiryManager({ role }: { role: 'superadmin' | 'manager' | 'admin' | 'vendor' }) {
  const [inquiries, setInquiries] = useState<SellInquiry[]>([]);
  const [metrics, setMetrics] = useState<SellInquiryMetrics>({
    total: 0,
    new: 0,
    contacted: 0,
    inspectionScheduled: 0,
    priceNegotiated: 0,
    purchased: 0,
    rejected: 0,
    verifiedRc: 0,
    totalExpectedVolume: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal inspection state
  const [dossierInquiry, setDossierInquiry] = useState<SellInquiry | null>(null);
  const [counterOfferInput, setCounterOfferInput] = useState('');
  const [adminNotesInput, setAdminNotesInput] = useState('');

  async function loadInquiries() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sell-inquiries');
      if (!res.ok) throw new Error('Failed to load sell inquiries.');
      const data = await res.json();
      setInquiries(data.inquiries || []);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading inquiries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInquiries();
  }, []);

  useEffect(() => {
    if (dossierInquiry) {
      setCounterOfferInput(dossierInquiry.pricing.counterOffer ? String(dossierInquiry.pricing.counterOffer) : '');
      setAdminNotesInput(dossierInquiry.adminNotes || '');
    }
  }, [dossierInquiry]);

  async function updateInquiryStatus(id: string, status: SellInquiry['status']) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/sell-inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Could not update inquiry status.');
      const data = await res.json();
      setInquiries(prev => prev.map(item => item.id === id ? data.inquiry : item));
      if (dossierInquiry?.id === id) {
        setDossierInquiry(data.inquiry);
      }
      setNotice(`Inquiry status updated to ${status.replace('_', ' ')}.`);
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateRcVerification(id: string, verificationStatus: SellInquiry['documents']['verificationStatus'], verificationNotes?: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/sell-inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus, verificationNotes }),
      });
      if (!res.ok) throw new Error('Could not update document verification.');
      const data = await res.json();
      setInquiries(prev => prev.map(item => item.id === id ? data.inquiry : item));
      if (dossierInquiry?.id === id) {
        setDossierInquiry(data.inquiry);
      }
      setNotice(verificationStatus === 'verified' ? '✓ RC Document Approved & Verified.' : 'RC Document status updated.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update RC verification.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveDossierUpdates(id: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/sell-inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminNotes: adminNotesInput,
          counterOffer: Number(counterOfferInput) || 0,
        }),
      });
      if (!res.ok) throw new Error('Could not save notes and offer.');
      const data = await res.json();
      setInquiries(prev => prev.map(item => item.id === id ? data.inquiry : item));
      setDossierInquiry(data.inquiry);
      setNotice('Inquiry notes and counter-offer saved.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save updates.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteInquiry(id: string) {
    if (!window.confirm('Are you sure you want to permanently delete this sell inquiry?')) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/sell-inquiries/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete inquiry.');
      setInquiries(prev => prev.filter(i => i.id !== id));
      if (dossierInquiry?.id === id) setDossierInquiry(null);
      setNotice('Inquiry removed permanently.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setUpdatingId(null);
    }
  }

  // Filter inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (cityFilter !== 'all' && item.seller.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.inquiryNumber?.toLowerCase().includes(q) ||
        item.seller.name?.toLowerCase().includes(q) ||
        item.seller.phone?.includes(q) ||
        item.vehicle.make?.toLowerCase().includes(q) ||
        item.vehicle.model?.toLowerCase().includes(q) ||
        item.vehicle.registration?.toLowerCase().includes(q) ||
        item.seller.city?.toLowerCase().includes(q)
      );
    });
  }, [inquiries, statusFilter, cityFilter, search]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    inquiries.forEach(i => {
      if (i.seller.city) set.add(i.seller.city);
    });
    return Array.from(set).sort();
  }, [inquiries]);

  function getStatusBadge(status: SellInquiry['status']) {
    switch (status) {
      case 'new':
        return <span className="management-status pending" style={{ background: '#fef3c7', color: '#92400e' }}><Clock size={11}/> New Request</span>;
      case 'contacted':
        return <span className="management-status active" style={{ background: '#e0f2fe', color: '#0369a1' }}><MessageCircle size={11}/> Contacted</span>;
      case 'inspection_scheduled':
        return <span className="management-status active" style={{ background: '#ede9fe', color: '#6d28d9' }}><Calendar size={11}/> Inspection Scheduled</span>;
      case 'price_negotiated':
        return <span className="management-status active" style={{ background: '#fce7f3', color: '#be185d' }}><DollarSign size={11}/> Price Negotiated</span>;
      case 'purchased':
        return <span className="management-status active" style={{ background: '#dcfce7', color: '#15803d' }}><CheckCheck size={11}/> Deal Closed / Purchased</span>;
      case 'rejected':
        return <span className="management-status suspended" style={{ background: '#fee2e2', color: '#b91c1c' }}><XCircle size={11}/> Rejected</span>;
      default:
        return <span className="management-status active">{status}</span>;
    }
  }

  function getRcBadge(status: SellInquiry['documents']['verificationStatus']) {
    switch (status) {
      case 'verified':
        return <span className="car-verify-badge verified" title="RC Document Verified">✓ RC Verified</span>;
      case 'under_verification':
        return <span className="car-verify-badge under_verification" title="RC Document Uploaded & Under Review">⏳ RC In Review</span>;
      case 'rejected':
        return <span className="car-verify-badge rejected" title="RC Document Rejected">✕ RC Rejected</span>;
      default:
        return <span className="car-verify-badge unverified" title="No RC Document Uploaded">○ No RC</span>;
    }
  }

  // Count uploaded photos
  function getPhotoCount(media: SellInquiry['media']) {
    let count = 0;
    if (media.photoFrontId) count++;
    if (media.photoBackId) count++;
    if (media.photoLeftSideId) count++;
    if (media.photoRightSideId) count++;
    if (media.photoInteriorId) count++;
    if (media.additionalPhotoIds?.length) count += media.additionalPhotoIds.length;
    return count;
  }

  return (
    <div className="sell-inquiries-container">
      {/* Header */}
      <div className="management-section-heading management-list-heading">
        <div>
          <span className="eyebrow">SELLER ACQUISITIONS &amp; VALUATION DESK</span>
          <h2>Vehicle Sell Enquiries</h2>
          <p>
            Review incoming seller submissions complete with 5-angle car photos, registration certificate (RC Book), expected price, purchase year, and owner history.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="management-refresh"
            onClick={loadInquiries}
            disabled={loading}
            title="Refresh Inquiries"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="management-banner success" style={{ marginBottom: '16px' }}>
          <Check size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="management-banner error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="management-metric-grid" style={{ marginBottom: '24px' }}>
        <article className="management-metric">
          <span className="management-metric-icon blue"><CarFront size={18} /></span>
          <span>Total Inquiries</span>
          <b>{loading ? '—' : metrics.total}</b>
          <small>{metrics.new} requiring response</small>
        </article>

        <article className="management-metric">
          <span className="management-metric-icon amber"><Clock size={18} /></span>
          <span>New / Pending</span>
          <b>{loading ? '—' : metrics.new}</b>
          <small>Fresh seller requests</small>
        </article>

        <article className="management-metric">
          <span className="management-metric-icon green"><ShieldCheck size={18} /></span>
          <span>RC Verified</span>
          <b>{loading ? '—' : metrics.verifiedRc}</b>
          <small>Authentic ownership</small>
        </article>

        <article className="management-metric">
          <span className="management-metric-icon violet"><DollarSign size={18} /></span>
          <span>Expected Volume</span>
          <b>{loading ? '—' : formatINR(metrics.totalExpectedVolume || 0)}</b>
          <small>{metrics.purchased} deals acquired</small>
        </article>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="management-toolbar management-listing-filters" style={{ marginBottom: '18px' }}>
        <label className="management-search" style={{ flex: '1 1 320px' }}>
          <Search size={17} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search seller name, phone, plate #, make, model, city…"
            aria-label="Search sell inquiries"
          />
        </label>

        <label className="management-filter">
          City
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
            <option value="all">All Cities ({inquiries.length})</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>

        <label className="management-filter">
          Status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses ({inquiries.length})</option>
            <option value="new">New Requests</option>
            <option value="contacted">Contacted</option>
            <option value="inspection_scheduled">Inspection Scheduled</option>
            <option value="price_negotiated">Price Negotiated</option>
            <option value="purchased">Deals Closed</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <span>{filteredInquiries.length} {filteredInquiries.length === 1 ? 'inquiry' : 'inquiries'}</span>
      </div>

      {/* Inquiry List */}
      <div className="management-listings">
        {filteredInquiries.map(inquiry => {
          const photoCount = getPhotoCount(inquiry.media);
          const heroPhotoId = inquiry.media.photoFrontId || inquiry.media.photoLeftSideId || inquiry.media.photoBackId;
          const heroPhotoUrl = heroPhotoId ? `/api/photos/${encodeURIComponent(heroPhotoId)}` : null;

          return (
            <article className="management-car-row" key={inquiry.id} style={{ gridTemplateColumns: '70px minmax(180px, 1.2fr) minmax(130px, 1fr) minmax(140px, auto) auto' }}>
              {/* Photo Thumbnail */}
              <div
                className="management-car-image clickable"
                onClick={() => setDossierInquiry(inquiry)}
                title="Click to view full 5-angle photos and RC documents"
                style={{ width: '70px', height: '60px', position: 'relative' }}
              >
                {heroPhotoUrl ? (
                  <img src={heroPhotoUrl} alt={`${inquiry.vehicle.make} ${inquiry.vehicle.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <CarFront size={24} style={{ color: '#94a3b8' }} />
                )}
                {photoCount > 0 && (
                  <span style={{ position: 'absolute', bottom: '2px', right: '3px', background: 'rgba(15,23,42,0.85)', color: '#fff', fontSize: '8.5px', fontWeight: 800, padding: '1px 4px', borderRadius: '4px' }}>
                    {photoCount} 📷
                  </span>
                )}
              </div>

              {/* Vehicle & Registration */}
              <div
                className="management-car-name clickable"
                onClick={() => setDossierInquiry(inquiry)}
                title="Click to inspect vehicle dossier"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <b>{inquiry.vehicle.mfgYear} {inquiry.vehicle.make} {inquiry.vehicle.model}</b>
                  <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.04em' }}>
                    {inquiry.vehicle.registration}
                  </span>
                </div>
                <span>{inquiry.vehicle.variant || 'Standard'} · {inquiry.seller.city}</span>
                <small style={{ color: '#64748b' }}>
                  Purchased in {inquiry.vehicle.purchaseYear} · {inquiry.vehicle.owners} {inquiry.vehicle.owners === 1 ? 'Owner' : 'Owners'} · {inquiry.vehicle.km?.toLocaleString('en-IN')} km · {inquiry.vehicle.fuel}
                </small>
              </div>

              {/* Seller Contact Strip */}
              <div style={{ minWidth: 0, fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <b style={{ color: '#1e293b' }}>{inquiry.seller.name}</b>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href={`tel:${inquiry.seller.phone}`}
                    style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    title="Call Seller"
                  >
                    <Phone size={11} /> {inquiry.seller.phone}
                  </a>
                  <a
                    href={`https://wa.me/91${inquiry.seller.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${inquiry.seller.name}, this is Cars21 regarding your car sell enquiry for ${inquiry.vehicle.make} ${inquiry.vehicle.model} (${inquiry.vehicle.registration}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle size={11} /> WhatsApp
                  </a>
                </div>
                <small style={{ color: '#94a3b8' }}>
                  Received {new Date(inquiry.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>

              {/* Pricing & Verification Badge */}
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px' }}>
                  <strong className="management-price" style={{ color: '#0f172a', fontSize: '14px' }}>
                    {formatINR(inquiry.pricing.expectedPrice)}
                  </strong>
                  <small style={{ color: '#64748b', fontSize: '9.5px' }}>
                    Expected Price {inquiry.pricing.estimatedMarketValue ? `(Est: ${formatINR(inquiry.pricing.estimatedMarketValue)})` : ''}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {getStatusBadge(inquiry.status)}
                  {getRcBadge(inquiry.documents.verificationStatus)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="management-row-actions">
                <button
                  type="button"
                  className="management-view-car-btn"
                  onClick={() => setDossierInquiry(inquiry)}
                  title="Open full inspection dossier, photos, and RC document"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Eye size={14} /> View Dossier
                </button>

                {(role === 'superadmin' || role === 'manager') && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => deleteInquiry(inquiry.id)}
                    title="Delete inquiry"
                    disabled={updatingId === inquiry.id}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {filteredInquiries.length === 0 && (
          <div className="management-empty">
            <CarFront size={28} />
            <b>{loading ? 'Loading sell inquiries…' : 'No sell inquiries found'}</b>
            <span>{search || statusFilter !== 'all' || cityFilter !== 'all' ? 'Try adjusting your filters or search terms.' : 'Incoming seller inquiries will appear here.'}</span>
          </div>
        )}
      </div>

      {/* FULL INSPECTION DOSSIER MODAL */}
      {dossierInquiry && (
        <div className="management-modal-backdrop" onClick={() => setDossierInquiry(null)}>
          <div
            className="management-modal"
            style={{ width: 'min(980px, 96vw)', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <header>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '36px', height: '36px', background: '#eff6ff', color: '#2563eb', borderRadius: '10px', display: 'grid', placeItems: 'center' }}>
                  <CarFront size={20} />
                </span>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                    {dossierInquiry.vehicle.mfgYear} {dossierInquiry.vehicle.make} {dossierInquiry.vehicle.model} {dossierInquiry.vehicle.variant || ''}
                  </h2>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Inquiry #{dossierInquiry.inquiryNumber} · Plate: <strong>{dossierInquiry.vehicle.registration}</strong> · Location: <strong>{dossierInquiry.seller.city}</strong>
                  </span>
                </div>
              </div>
              <button type="button" aria-label="Close dossier" onClick={() => setDossierInquiry(null)}>
                <X size={18} />
              </button>
            </header>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* TOP STRIP: Status & Quick Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: '#f8fafc', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Inquiry Workflow Status:</span>
                  <select
                    value={dossierInquiry.status}
                    onChange={e => updateInquiryStatus(dossierInquiry.id, e.target.value as SellInquiry['status'])}
                    disabled={updatingId === dossierInquiry.id}
                    style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '12px', fontWeight: 700, background: '#fff', color: '#0f172a' }}
                  >
                    <option value="new">New Request</option>
                    <option value="contacted">Seller Contacted</option>
                    <option value="inspection_scheduled">Inspection Scheduled</option>
                    <option value="price_negotiated">Price Negotiated</option>
                    <option value="purchased">Deal Closed / Purchased</option>
                    <option value="rejected">Rejected / Withdrawn</option>
                  </select>
                  {getStatusBadge(dossierInquiry.status)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <a
                    href={`https://wa.me/91${dossierInquiry.seller.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${dossierInquiry.seller.name}, this is Cars21 regarding your car sell enquiry for ${dossierInquiry.vehicle.make} ${dossierInquiry.vehicle.model} (${dossierInquiry.vehicle.registration}). Expected Price: ${formatINR(dossierInquiry.pricing.expectedPrice)}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="management-primary compact"
                    style={{ background: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MessageCircle size={15} /> Chat on WhatsApp
                  </a>

                  <a
                    href={`tel:${dossierInquiry.seller.phone}`}
                    className="management-secondary compact"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Phone size={15} /> Call Seller
                  </a>
                </div>
              </div>

              {/* 5-ANGLE VEHICLE PHOTO GALLERY */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Camera size={16} style={{ color: '#2563eb' }} /> Required Vehicle Inspection Photos (5 Perspectives)
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Front · Back · Left Side · Right Side · Cabin Interior
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                  {[
                    { label: 'Front View', id: dossierInquiry.media.photoFrontId, required: true },
                    { label: 'Back / Rear View', id: dossierInquiry.media.photoBackId, required: true },
                    { label: 'Left Side Profile', id: dossierInquiry.media.photoLeftSideId, required: true },
                    { label: 'Right Side Profile', id: dossierInquiry.media.photoRightSideId, required: true },
                    { label: 'Cabin Interior', id: dossierInquiry.media.photoInteriorId, required: true },
                  ].map(photo => (
                    <div
                      key={photo.label}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ height: '125px', background: '#e2e8f0', display: 'grid', placeItems: 'center', position: 'relative' }}>
                        {photo.id ? (
                          <img
                            src={`/api/photos/${encodeURIComponent(photo.id)}`}
                            alt={photo.label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px' }}>
                            <ImageIcon size={24} style={{ margin: '0 auto 4px' }} />
                            <small style={{ display: 'block', fontSize: '10px' }}>Not Uploaded</small>
                          </div>
                        )}

                        {photo.id && (
                          <a
                            href={`/api/photos/${encodeURIComponent(photo.id)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: 'rgba(15,23,42,0.75)',
                              color: '#fff',
                              borderRadius: '6px',
                              padding: '4px 6px',
                              fontSize: '10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              textDecoration: 'none',
                            }}
                            title="Open full resolution photo"
                          >
                            <ExternalLink size={10} /> View
                          </a>
                        )}
                      </div>

                      <div style={{ padding: '8px 10px', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>{photo.label}</span>
                        {photo.id ? (
                          <span style={{ fontSize: '9.5px', color: '#16a34a', fontWeight: 800 }}>✓ Attached</span>
                        ) : (
                          <span style={{ fontSize: '9.5px', color: '#ef4444', fontWeight: 700 }}>Missing</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REQUIRED DOCUMENT: RC BOOK & INSURANCE */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '18px' }}>
                {/* RC Book Inspection */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '32px', height: '32px', background: '#eff6ff', color: '#2563eb', borderRadius: '8px', display: 'grid', placeItems: 'center' }}>
                        <FileText size={18} />
                      </span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>Registration Certificate (RC Book)</h4>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>Primary ownership legal verification document</span>
                      </div>
                    </div>
                    {getRcBadge(dossierInquiry.documents.verificationStatus)}
                  </div>

                  {dossierInquiry.documents.rcBookPhotoId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                      <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <img
                          src={`/api/photos/${encodeURIComponent(dossierInquiry.documents.rcBookPhotoId)}`}
                          alt="RC Book"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            // If PDF or fallback
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: 'block', fontSize: '12px', color: '#1e293b' }}>RC Document Stored</b>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>Registration Number: {dossierInquiry.vehicle.registration}</span>
                        <div style={{ marginTop: '6px' }}>
                          <a
                            href={`/api/photos/${encodeURIComponent(dossierInquiry.documents.rcBookPhotoId)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="management-inline-link"
                            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ExternalLink size={12} /> Open Full RC Document
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '16px', textAlign: 'center', marginBottom: '14px', color: '#64748b', fontSize: '11px' }}>
                      Seller has not uploaded the RC book photo yet. Please request it via WhatsApp.
                    </div>
                  )}

                  {/* RC Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="quick-verify-btn approve"
                      style={{ flex: 1, height: '36px', fontSize: '11px' }}
                      onClick={() => updateRcVerification(dossierInquiry.id, 'verified', 'RC Verified by Operations Admin')}
                      disabled={updatingId === dossierInquiry.id}
                    >
                      <Check size={13} /> Approve RC as Verified
                    </button>
                    <button
                      type="button"
                      className="quick-verify-btn reject"
                      style={{ flex: 1, height: '36px', fontSize: '11px' }}
                      onClick={() => updateRcVerification(dossierInquiry.id, 'rejected', 'RC Document mismatch or invalid')}
                      disabled={updatingId === dossierInquiry.id}
                    >
                      <XCircle size={13} /> Reject RC
                    </button>
                  </div>
                </div>

                {/* Seller & Location Info */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} style={{ color: '#2563eb' }} /> Seller Contact Information
                  </h4>

                  <div style={{ display: 'grid', gap: '8px', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Full Name:</span>
                      <b style={{ color: '#0f172a' }}>{dossierInquiry.seller.name}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Mobile Number:</span>
                      <b style={{ color: '#0f172a' }}>{dossierInquiry.seller.phone}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Email:</span>
                      <span style={{ color: '#0f172a' }}>{dossierInquiry.seller.email || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>City &amp; State:</span>
                      <span style={{ color: '#0f172a' }}>{dossierInquiry.seller.city}, {dossierInquiry.seller.state || 'Gujarat'} {dossierInquiry.seller.pincode ? `(${dossierInquiry.seller.pincode})` : ''}</span>
                    </div>
                    {dossierInquiry.seller.address && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                        <span style={{ color: '#64748b' }}>Address:</span>
                        <span style={{ color: '#0f172a', textAlign: 'right', maxWidth: '65%' }}>{dossierInquiry.seller.address}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Timeline:</span>
                      <b style={{ color: '#2563eb', textTransform: 'capitalize' }}>
                        {dossierInquiry.pricing.sellingTimeline?.replace('_', ' ') || 'Immediate'}
                      </b>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILED SPECIFICATIONS & FINANCIALS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '18px' }}>
                {/* Vehicle Specifications */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CarFront size={16} style={{ color: '#2563eb' }} /> Vehicle Technical Profile
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '11px' }}>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Company / Make</small>
                      <b>{dossierInquiry.vehicle.make}</b>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Model &amp; Variant</small>
                      <b>{dossierInquiry.vehicle.model} {dossierInquiry.vehicle.variant || ''}</b>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Year of Purchase</small>
                      <b style={{ color: '#2563eb' }}>{dossierInquiry.vehicle.purchaseYear}</b>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Number of Owners</small>
                      <b style={{ color: '#2563eb' }}>{dossierInquiry.vehicle.owners} {dossierInquiry.vehicle.owners === 1 ? 'Owner' : 'Owners'}</b>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Odometer</small>
                      <b>{dossierInquiry.vehicle.km?.toLocaleString('en-IN')} km</b>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Fuel &amp; Transmission</small>
                      <b>{dossierInquiry.vehicle.fuel} · {dossierInquiry.vehicle.transmission}</b>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Declared Condition</small>
                      <b>{dossierInquiry.vehicle.condition}</b>
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' }}>
                      <small style={{ color: '#64748b', display: 'block' }}>Registration State</small>
                      <b>{dossierInquiry.vehicle.registration}</b>
                    </div>
                  </div>

                  {dossierInquiry.vehicle.insuranceValidity && (
                    <div style={{ marginTop: '10px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '8px', fontSize: '11px', color: '#166534' }}>
                      <strong>Insurance:</strong> {dossierInquiry.vehicle.insuranceValidity}
                    </div>
                  )}
                  {dossierInquiry.vehicle.accidentalHistory && (
                    <div style={{ marginTop: '6px', padding: '8px 10px', background: '#fffbeb', borderRadius: '8px', fontSize: '11px', color: '#92400e' }}>
                      <strong>Accident / Damage History:</strong> {dossierInquiry.vehicle.accidentalHistory}
                    </div>
                  )}
                </div>

                {/* Financial Evaluation & Counter-Offer */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={16} style={{ color: '#2563eb' }} /> Pricing &amp; Negotiation Desk
                    </h4>

                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Seller Expecting:</span>
                        <strong style={{ fontSize: '17px', color: '#0f172a' }}>{formatINR(dossierInquiry.pricing.expectedPrice)}</strong>
                      </div>

                      {dossierInquiry.pricing.estimatedMarketValue && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Cars21 Algorithmic Valuation:</span>
                          <b style={{ fontSize: '13px', color: '#2563eb' }}>{formatINR(dossierInquiry.pricing.estimatedMarketValue)}</b>
                        </div>
                      )}
                    </div>

                    <label className="field-label" style={{ marginBottom: '12px' }}>
                      Cars21 Counter Offer / Deal Price (₹)
                      <input
                        type="number"
                        value={counterOfferInput}
                        onChange={e => setCounterOfferInput(e.target.value)}
                        placeholder="e.g. 1450000"
                        style={{ height: '38px' }}
                      />
                    </label>

                    <label className="field-label">
                      Internal Inspection &amp; Deal Notes
                      <textarea
                        value={adminNotesInput}
                        onChange={e => setAdminNotesInput(e.target.value)}
                        rows={3}
                        placeholder="Add inspection observations, paint meter reading, seller availability..."
                        style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '11.5px', fontFamily: 'inherit' }}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="management-primary"
                    style={{ marginTop: '14px', width: '100%', minHeight: '40px' }}
                    onClick={() => saveDossierUpdates(dossierInquiry.id)}
                    disabled={updatingId === dossierInquiry.id}
                  >
                    <Check size={15} /> Save Counter Offer &amp; Notes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

