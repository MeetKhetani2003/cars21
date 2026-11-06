'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Globe2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  ExternalLink, 
  KeyRound, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  TrendingUp, 
  FileText,
  Clock3,
  Copy,
  Check
} from 'lucide-react';

type IndexingStatus = {
  configured: boolean;
  clientEmail: string | null;
  siteUrl: string;
  hasPrivateKey: boolean;
};

type DealerItem = {
  id: string;
  businessName: string;
  slug: string;
  city: string;
  listingCount: number;
  rankPriority: number;
  url: string;
  lastModified?: string;
};

type IndexingLog = {
  id?: string;
  url: string;
  type: string;
  status: 'success' | 'failed' | 'pending_credentials';
  httpStatus?: number;
  error?: string;
  requestedBy?: string;
  createdAt: string;
};

export function IndexingManager({ role }: { role: 'superadmin' | 'manager' | 'admin' }) {
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [logs, setLogs] = useState<IndexingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchIndexingData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/indexing', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load indexing details');
      setStatus(data.status);
      setSitemapUrl(data.sitemapUrl);
      setDealers(data.dealers || []);
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with indexing service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndexingData();
  }, [fetchIndexingData]);

  // Handle single URL indexing
  const handleIndexUrl = async (url: string, label: string) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action: 'index_url' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit indexing request');

      if (data.pendingCredentials) {
        setNotice(`Indexing queued for ${label}. Add your Google Cloud Service Account credentials to .env.local to enable live transmission.`);
      } else {
        setNotice(`Successfully submitted ${label} to Google Search Console Indexing API!`);
      }
      await fetchIndexingData();
    } catch (err: any) {
      alert(err.message || 'Error requesting indexing');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle indexing all dealers in bulk
  const handleIndexAllDealers = async () => {
    if (!confirm(`Submit all ${dealers.length} car dealers and sitemap to Google Search Console for re-indexing?`)) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'index_all_dealers' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk indexing failed');

      if (data.pendingCredentials) {
        setNotice(`Queued ${data.submittedCount} dealer URLs. Complete the Google Cloud Service Account setup in .env.local to transmit live.`);
      } else {
        setNotice(`Successfully transmitted ${data.submittedCount} dealer pages to Google Search Console!`);
      }
      await fetchIndexingData();
    } catch (err: any) {
      alert(err.message || 'Error indexing dealers');
    } finally {
      setSubmitting(false);
    }
  };

  const copySitemap = () => {
    if (!sitemapUrl) return;
    navigator.clipboard.writeText(sitemapUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'grid', gap: '22px' }}>
      {/* Heading */}
      <div className="management-section-heading" style={{ margin: 0 }}>
        <div>
          <span className="eyebrow" style={{ color: '#2563eb', fontWeight: 800, letterSpacing: '0.08em' }}>
            GOOGLE SEARCH CONSOLE & AUTO-INDEXING
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 6px', color: '#0f172a' }}>
            Dealer Ranking & Dynamic Sitemap
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Dynamic real-time sitemap (`/sitemap.xml`) automatically reflects newly onboarded dealers. Google Search Console Indexing API notifies Googlebot immediately.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="management-secondary"
            onClick={fetchIndexingData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Status
          </button>
          <button
            type="button"
            className="management-primary"
            onClick={handleIndexAllDealers}
            disabled={submitting}
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
            <Send size={15} />
            {submitting ? 'Transmitting to Google...' : 'Submit All Dealers to Google'}
          </button>
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

      {/* Connection Status Card */}
      <div
        style={{
          background: status?.configured ? '#f0fdf4' : '#fffbeb',
          border: status?.configured ? '1px solid #bbf7d0' : '1px solid #fde68a',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'grid',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: status?.configured ? '#16a34a' : '#d97706',
                boxShadow: status?.configured ? '0 0 0 4px #dcfce7' : '0 0 0 4px #fef3c7'
              }}
            />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: status?.configured ? '#166534' : '#92400e' }}>
              {status?.configured ? 'Google Search Console Indexing API Connected' : 'Google Search Console Auto-Indexing Ready (Needs Service Account Key)'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#fff',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
                textDecoration: 'none'
              }}
            >
              Open Live sitemap.xml <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={copySitemap}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#fff',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
              {copied ? 'Copied URL!' : 'Copy Sitemap URL'}
            </button>
          </div>
        </div>

        {status?.configured ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
            Service Account <b>{status.clientEmail}</b> is active. Whenever a new car dealer is added or updated, Cars21 automatically sends an instant <b>URL_UPDATED</b> indexing notification to Google Search Console.
          </p>
        ) : (
          <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
              The auto-indexing code is implemented and triggers automatically whenever a new dealer is created. To allow Google to receive and process the indexing requests, you need to provide Google Cloud Service Account credentials:
            </p>
            <div style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', display: 'grid', gap: '6px' }}>
              <div><b>1. Google Cloud Console</b>: Enable the <b>Web Search Indexing API</b> (<code>indexing.googleapis.com</code>).</div>
              <div><b>2. Service Account</b>: Create a Service Account (e.g. <code>cars21-indexer@project.iam.gserviceaccount.com</code>) and download its private key JSON.</div>
              <div><b>3. Google Search Console</b>: In Settings &gt; Users and Permissions, add that Service Account email as an <b>Owner</b> for your property.</div>
              <div><b>4. .env.local</b>: Add <code>GOOGLE_INDEXING_CLIENT_EMAIL</code> and <code>GOOGLE_INDEXING_PRIVATE_KEY</code>.</div>
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Auto-Updated Dealers in Sitemap
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{dealers.length}</div>
          <small style={{ color: '#2563eb', fontWeight: 600, fontSize: '11px' }}>100% indexed in sitemap.xml</small>
        </div>

        <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Top Priority Dealers (0.85-0.95)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
            {dealers.filter(d => d.rankPriority >= 0.85).length}
          </div>
          <small style={{ color: '#16a34a', fontWeight: 600, fontSize: '11px' }}>Junagadh, Rajkot & active stock</small>
        </div>

        <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Google Search Console Pings
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{logs.length}</div>
          <small style={{ color: '#ca8a04', fontWeight: 600, fontSize: '11px' }}>Total indexing notifications logged</small>
        </div>
      </div>

      {/* Dealers Ranking & Indexing Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
              Car Dealers Sitemap Ranking & SEO Priority
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Ranked dynamically by verified inventory count and primary Gujarat hubs (Junagadh, Rajkot, Ahmedabad).
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>
            {dealers.length} Active Dealers
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                <th style={{ padding: '10px 8px' }}>Rank & Priority</th>
                <th style={{ padding: '10px 8px' }}>Dealership Name</th>
                <th style={{ padding: '10px 8px' }}>City Hub</th>
                <th style={{ padding: '10px 8px' }}>Active Inventory</th>
                <th style={{ padding: '10px 8px' }}>Dealer Public URL</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Google Indexing</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((dealer, idx) => {
                return (
                  <tr key={dealer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: dealer.rankPriority >= 0.85 ? '#dcfce7' : dealer.rankPriority >= 0.75 ? '#eff6ff' : '#f8fafc',
                          color: dealer.rankPriority >= 0.85 ? '#166534' : dealer.rankPriority >= 0.75 ? '#1e40af' : '#475569'
                        }}
                      >
                        #{idx + 1} • {dealer.rankPriority}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: '#0f172a' }}>
                      {dealer.businessName}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#475569' }}>
                      <span style={{ fontWeight: dealer.city.toLowerCase() === 'junagadh' ? 800 : 500 }}>
                        {dealer.city || 'Junagadh'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <b style={{ color: dealer.listingCount > 0 ? '#16a34a' : '#94a3b8' }}>
                        {dealer.listingCount} cars
                      </b>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <a
                        href={`/dealers/${dealer.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        /dealers/{dealer.slug} <ExternalLink size={11} />
                      </a>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleIndexUrl(dealer.url, dealer.businessName)}
                        disabled={submitting}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2563eb',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Send size={11} />
                        Request Indexing
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indexing Logs Stream */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
          Recent Google Search Console Notifications Log
        </h3>

        {logs.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            No indexing requests dispatched yet. Use &ldquo;Submit All Dealers to Google&rdquo; above or add a new dealer to trigger the first notification.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {logs.slice(0, 15).map((log, i) => (
              <div
                key={log.id || i}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: log.status === 'success' ? '#f0fdf4' : log.status === 'pending_credentials' ? '#fffbeb' : '#fef2f2',
                  border: log.status === 'success' ? '1px solid #bbf7d0' : log.status === 'pending_credentials' ? '1px solid #fde68a' : '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 800,
                      background: log.status === 'success' ? '#16a34a' : log.status === 'pending_credentials' ? '#d97706' : '#dc2626',
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}
                  >
                    {log.status}
                  </span>
                  <b style={{ color: '#1e293b' }}>{log.url}</b>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '11px' }}>
                  <span>{log.type}</span>
                  <span>•</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

