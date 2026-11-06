'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  Landmark, ShieldCheck, CheckCircle2, XCircle, Clock, 
  Search, Phone, Mail, MapPin, ExternalLink, FileText, 
  Download, User, CreditCard, ChevronRight, AlertCircle, 
  Check, RefreshCw, Trash2
} from 'lucide-react';
import { formatINR } from '../data';

export type LoanApplication = {
  id: string;
  applicationNumber: string;
  userId?: string | null;
  applicant: {
    name: string;
    mobile: string;
    email: string;
    address: {
      full: string;
      city: string;
      state: string;
      pincode: string;
    };
    aadhaarNumber: string;
    aadhaarPhotoId?: string | null;
    aadhaarFrontPhotoId?: string | null;
    aadhaarBackPhotoId?: string | null;
    panNumber: string;
    panPhotoId?: string | null;
    photoId?: string | null;
  };
  car: {
    id: string;
    make: string;
    model: string;
    variant?: string;
    year: number;
    price: number;
    city?: string;
    image?: string;
    vendorId?: string | null;
    vendorName?: string | null;
  };
  loanDetails: {
    carPrice: number;
    loanAmount: number;
    tenureMonths: number;
    interestRate: number;
    monthlyEmi: number;
  };
  status: 'new' | 'under_review' | 'documents_verified' | 'approved' | 'rejected' | 'disbursed';
  adminNotes?: string;
  reviewedBy?: {
    id: string;
    name: string;
    role: string;
    at: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type LoanMetrics = {
  total: number;
  new: number;
  underReview: number;
  documentsVerified: number;
  approved: number;
  disbursed: number;
  rejected: number;
  totalVolume: number;
};

export function LoanManager({ role }: { role: 'superadmin' | 'manager' | 'admin' | 'vendor' }) {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [metrics, setMetrics] = useState<LoanMetrics>({
    total: 0,
    new: 0,
    underReview: 0,
    documentsVerified: 0,
    approved: 0,
    disbursed: 0,
    rejected: 0,
    totalVolume: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Expanded application for full inspection
  const [inspectingLoan, setInspectingLoan] = useState<LoanApplication | null>(null);

  async function loadLoans() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/loans', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load loan applications.');
      setLoans(data.loans || []);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch loan applications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLoans();
  }, []);

  async function updateStatus(loan: LoanApplication, status: LoanApplication['status'], adminNotes?: string) {
    setUpdatingId(loan.id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/loans/${encodeURIComponent(loan.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status, adminNotes: adminNotes ?? loan.adminNotes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update loan status.');

      const updated = {
        ...loan,
        status,
        adminNotes: adminNotes ?? loan.adminNotes,
        updatedAt: new Date().toISOString(),
      };
      setLoans(current => current.map(item => item.id === loan.id ? updated : item));
      if (inspectingLoan && inspectingLoan.id === loan.id) {
        setInspectingLoan(updated);
      }
      setNotice(`Loan application ${loan.applicationNumber} updated to ${status.replace('_', ' ')}.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update loan status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteLoan(loan: LoanApplication) {
    if (!window.confirm(`Permanently remove loan application ${loan.applicationNumber} for ${loan.applicant.name}?`)) return;
    try {
      const res = await fetch(`/api/admin/loans/${encodeURIComponent(loan.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Could not delete loan application.');
      setLoans(current => current.filter(item => item.id !== loan.id));
      if (inspectingLoan && inspectingLoan.id === loan.id) setInspectingLoan(null);
      setNotice('Loan application deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deletion failed.');
    }
  }

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      if (!matchesStatus) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.applicationNumber.toLowerCase().includes(q) ||
        l.applicant.name.toLowerCase().includes(q) ||
        l.applicant.mobile.includes(q) ||
        l.applicant.email.toLowerCase().includes(q) ||
        l.applicant.panNumber.toLowerCase().includes(q) ||
        l.applicant.aadhaarNumber.includes(q) ||
        l.car.make.toLowerCase().includes(q) ||
        l.car.model.toLowerCase().includes(q) ||
        l.applicant.address.city.toLowerCase().includes(q)
      );
    });
  }, [loans, statusFilter, search]);

  const statusColors: Record<string, string> = {
    new: 'blue',
    under_review: 'amber',
    documents_verified: 'cyan',
    approved: 'green',
    disbursed: 'emerald',
    rejected: 'rose',
  };

  return (
    <div className="loan-manager-wrapper">
      {/* Section Header */}
      <div className="management-section-heading management-list-heading">
        <div>
          <span className="eyebrow">AUTO FINANCING DESK</span>
          <h2>Car Loan Applications</h2>
          <p>Review customer KYC documents (Aadhaar, PAN &amp; Photo), verify identity, and sanction financing.</p>
        </div>
        <button className="management-secondary compact" onClick={() => void loadLoans()} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="management-banner error" role="alert">{error}</div>}
      {notice && <div className="management-banner success" role="status"><Check size={16}/> {notice}</div>}

      {/* Metrics Row */}
      <div className="management-metric-grid" style={{ marginBottom: '18px' }}>
        <article className="management-metric">
          <span className="management-metric-icon blue"><Landmark size={18}/></span>
          <span>All Applications</span>
          <b>{metrics.total}</b>
          <small>Total requested financing</small>
        </article>
        <article className="management-metric">
          <span className="management-metric-icon amber"><Clock size={18}/></span>
          <span>New / Pending</span>
          <b>{metrics.new + metrics.underReview}</b>
          <small>Needs KYC verification</small>
        </article>
        <article className="management-metric">
          <span className="management-metric-icon green"><CheckCircle2 size={18}/></span>
          <span>Approved / Disbursed</span>
          <b>{metrics.approved + metrics.disbursed}</b>
          <small>Sanctioned auto loans</small>
        </article>
        <article className="management-metric">
          <span className="management-metric-icon violet"><CreditCard size={18}/></span>
          <span>Loan Volume</span>
          <b>{formatINR(metrics.totalVolume)}</b>
          <small>Gross financing requested</small>
        </article>
      </div>

      {/* Filter and Search Bar */}
      <div className="management-toolbar management-listing-filters">
        <label className="management-search">
          <Search size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search applicant name, phone, PAN, Aadhaar, vehicle…"
          />
        </label>
        <label className="management-filter">
          Status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses ({loans.length})</option>
            <option value="new">New ({metrics.new})</option>
            <option value="under_review">Under Review ({metrics.underReview})</option>
            <option value="documents_verified">KYC Verified ({metrics.documentsVerified})</option>
            <option value="approved">Approved ({metrics.approved})</option>
            <option value="disbursed">Disbursed ({metrics.disbursed})</option>
            <option value="rejected">Rejected ({metrics.rejected})</option>
          </select>
        </label>
        <span>{filteredLoans.length} {filteredLoans.length === 1 ? 'application' : 'applications'}</span>
      </div>

      {/* Applications List */}
      <div className="loan-applications-list">
        {filteredLoans.map(loan => (
          <article className="loan-app-card" key={loan.id}>
            <div className="loan-card-header">
              <div className="app-id-pill">
                <Landmark size={14} />
                <b>{loan.applicationNumber}</b>
                <span className={`status-pill ${statusColors[loan.status] || 'blue'}`}>
                  {loan.status.replace('_', ' ')}
                </span>
              </div>
              <time className="app-time">
                {new Date(loan.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            </div>

            <div className="loan-card-grid">
              {/* Applicant Info Column */}
              <div className="loan-card-col">
                <span className="col-label">APPLICANT &amp; KYC</span>
                <div className="applicant-item">
                  <div className="applicant-avatar">
                    {loan.applicant.photoId ? (
                      <img src={`/api/photos/${encodeURIComponent(loan.applicant.photoId)}`} alt={loan.applicant.name} />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div>
                    <h4 className="applicant-name">{loan.applicant.name}</h4>
                    <div className="contact-links">
                      <a href={`tel:${loan.applicant.mobile}`} className="contact-chip">
                        <Phone size={12} /> {loan.applicant.mobile}
                      </a>
                      <a href={`mailto:${loan.applicant.email}`} className="contact-chip">
                        <Mail size={12} /> {loan.applicant.email}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="address-snippet">
                  <MapPin size={12} />
                  <span>
                    {loan.applicant.address.full}, {loan.applicant.address.city}, {loan.applicant.address.state}
                    {loan.applicant.address.pincode ? ` - ${loan.applicant.address.pincode}` : ''}
                  </span>
                </div>
              </div>

              {/* Vehicle & Financing Column */}
              <div className="loan-card-col">
                <span className="col-label">VEHICLE &amp; FINANCING</span>
                <div className="car-finance-box">
                  <div>
                    <b className="car-name">{loan.car.year} {loan.car.make} {loan.car.model}</b>
                    <small className="car-var">{loan.car.variant || 'Standard'} · {loan.car.city}</small>
                  </div>
                  <div className="price-tag-wrap">
                    <small>Vehicle Price: {formatINR(loan.car.price)}</small>
                  </div>
                </div>

                <div className="loan-figures-row">
                  <div className="fig-box">
                    <small>Loan Amount</small>
                    <b className="text-primary">{formatINR(loan.loanDetails.loanAmount)}</b>
                  </div>
                  <div className="fig-box">
                    <small>Tenure</small>
                    <b>{loan.loanDetails.tenureMonths} Months</b>
                  </div>
                  <div className="fig-box">
                    <small>Monthly EMI</small>
                    <b>{formatINR(loan.loanDetails.monthlyEmi)}/mo</b>
                  </div>
                </div>
              </div>

              {/* KYC Document Proofs Column */}
              <div className="loan-card-col">
                <span className="col-label">KYC DOCUMENTS SUBMITTED</span>
                <div className="kyc-badges-strip">
                  {/* Aadhaar Card (Front & Back) */}
                  <div className={`kyc-status-chip ${loan.applicant.aadhaarFrontPhotoId || loan.applicant.aadhaarPhotoId || loan.applicant.aadhaarBackPhotoId ? 'has-file' : 'no-file'}`}>
                    <CreditCard size={13} />
                    <div>
                      <span>Aadhaar: <b>{loan.applicant.aadhaarNumber ? `•••• ${loan.applicant.aadhaarNumber.slice(-4)}` : 'No Number'}</b></span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        {(loan.applicant.aadhaarFrontPhotoId || loan.applicant.aadhaarPhotoId) ? (
                          <a href={`/api/photos/${encodeURIComponent(loan.applicant.aadhaarFrontPhotoId || loan.applicant.aadhaarPhotoId!)}`} target="_blank" rel="noreferrer" className="doc-link">
                            View Front <ExternalLink size={10} />
                          </a>
                        ) : (
                          <small className="text-muted">No front scan</small>
                        )}
                        {loan.applicant.aadhaarBackPhotoId ? (
                          <a href={`/api/photos/${encodeURIComponent(loan.applicant.aadhaarBackPhotoId)}`} target="_blank" rel="noreferrer" className="doc-link">
                            View Back <ExternalLink size={10} />
                          </a>
                        ) : (
                          <small className="text-muted">No back scan</small>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PAN Card */}
                  <div className={`kyc-status-chip ${loan.applicant.panPhotoId ? 'has-file' : 'no-file'}`}>
                    <CreditCard size={13} />
                    <div>
                      <span>PAN: <b>{loan.applicant.panNumber || 'No Number'}</b></span>
                      {loan.applicant.panPhotoId ? (
                        <a href={`/api/photos/${encodeURIComponent(loan.applicant.panPhotoId)}`} target="_blank" rel="noreferrer" className="doc-link">
                          View PAN File <ExternalLink size={10} />
                        </a>
                      ) : (
                        <small className="text-muted">No scan uploaded</small>
                      )}
                    </div>
                  </div>

                  {/* Applicant Photo */}
                  <div className={`kyc-status-chip ${loan.applicant.photoId ? 'has-file' : 'no-file'}`}>
                    <User size={13} />
                    <div>
                      <span>Applicant Photo</span>
                      {loan.applicant.photoId ? (
                        <a href={`/api/photos/${encodeURIComponent(loan.applicant.photoId)}`} target="_blank" rel="noreferrer" className="doc-link">
                          View Photo <ExternalLink size={10} />
                        </a>
                      ) : (
                        <small className="text-muted">No photo</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="loan-card-foot">
              <div className="status-update-control">
                <label>
                  <span>Update Loan Status:</span>
                  <select
                    value={loan.status}
                    disabled={updatingId === loan.id}
                    onChange={e => void updateStatus(loan, e.target.value as LoanApplication['status'])}
                  >
                    <option value="new">New (Needs KYC check)</option>
                    <option value="under_review">Under Review (Bank processing)</option>
                    <option value="documents_verified">KYC Documents Verified ✓</option>
                    <option value="approved">Loan Sanctioned / Approved ✓</option>
                    <option value="disbursed">Loan Disbursed to Vendor 💰</option>
                    <option value="rejected">Rejected ✕</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={`/car/${encodeURIComponent(loan.car.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="management-secondary compact"
                  title="View vehicle marketplace page"
                >
                  <ExternalLink size={13} /> View Vehicle
                </a>
                {(role === 'superadmin' || role === 'manager') && (
                  <button
                    type="button"
                    className="management-secondary compact danger"
                    onClick={() => void deleteLoan(loan)}
                    title="Delete application"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}

        {filteredLoans.length === 0 && !loading && (
          <div className="management-empty">
            <Landmark size={32} />
            <b>No loan applications found</b>
            <span>{search || statusFilter !== 'all' ? 'Try changing your search or status filter.' : 'When buyers apply for auto financing on any car, their applications and KYC documents will appear here.'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

