'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { 
  ArrowLeft, Calendar, CalendarDays, CarFront, CheckCircle2, Clock3, 
  FileText, Heart, History, Landmark, MessageSquare, MousePointerClick, 
  Phone, Search, ShieldCheck, Sparkles, Store, UserCheck, UserRound 
} from 'lucide-react';

type Client = { 
  userId: string; 
  name: string; 
  email: string; 
  phone?: string; 
  city?: string; 
  isLeadSession?: boolean; 
  lastSeen: string; 
  recentCount: number; 
  historyCount: number; 
  totalCount: number; 
};

type Event = { 
  id: string; 
  action: string; 
  targetType: string; 
  targetLabel?: string; 
  buttonName?: string; 
  details?: string; 
  carId?: string; 
  carLabel?: string; 
  vendorId?: string; 
  vendorName?: string; 
  phone?: string; 
  city?: string; 
  createdAt: string; 
};

const actionLabels: Record<string, string> = { 
  search: 'Searched Cars21', 
  car_view: 'Viewed Car Page', 
  test_drive: 'Scheduled Test Drive',
  express_interest: 'Expressed Interest / Offer',
  emi_calculate: 'Calculated Loan EMI',
  vendor_view: 'Opened Showroom / Dealer', 
  vendor_save: 'Saved Dealer', 
  vendor_unsave: 'Removed Saved Dealer', 
  reveal_phone: 'Revealed Dealer Contact / WhatsApp', 
  contact_dealer: 'Contacted Dealer / Showroom',
  inquiry: 'Sent Car Inquiry / Booking', 
  wishlist_add: 'Added Car to Wishlist', 
  wishlist_remove: 'Removed Car from Wishlist',
  button_click: 'Action Button Clicked',
  inspection_view: 'Viewed 140-Point Diagnostic Report',
  report_download: 'Downloaded Diagnostic Report',
  buy_lead_captured: 'Submitted Lead Form (Unlocked Access)',
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'History could not be loaded.');
  return result as T;
}

export function UserHistoryPanel() {
  const [bucket, setBucket] = useState<'history' | 'recent'>('recent');
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [carId, setCarId] = useState('all');
  const [vendorId, setVendorId] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadClients(nextBucket = bucket) {
    setLoading(true); setError('');
    try { 
      const result = await getJson<{ clients: Client[] }>(`/api/admin/user-history?mode=users&bucket=${nextBucket}`); 
      setClients(result.clients); 
    }
    catch (reason) { 
      setError(reason instanceof Error ? reason.message : 'History could not be loaded.'); 
    }
    finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { void loadClients(bucket); }, [bucket]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true); setError('');
    const params = new URLSearchParams({ mode: 'events', bucket, userId: selected.userId });
    void getJson<{ events: Event[]; client?: Partial<Client> }>(`/api/admin/user-history?${params}`).then(result => { 
      if (active) {
        setEvents(result.events || []);
        if (result.client) {
          setSelected(prev => prev ? ({ ...prev, ...result.client }) : prev);
        }
      }
    })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Activity history could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected?.userId, bucket]);

  async function loadEvents(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selected) return;
    setLoading(true); setError('');
    const params = new URLSearchParams({ mode: 'events', bucket, userId: selected.userId });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (targetType !== 'all') params.set('targetType', targetType);
    if (carId !== 'all') params.set('carId', carId);
    if (vendorId !== 'all') params.set('vendorId', vendorId);
    try { 
      const result = await getJson<{ events: Event[] }>(`/api/admin/user-history?${params}`); 
      setEvents(result.events || []); 
    }
    catch (reason) { 
      setError(reason instanceof Error ? reason.message : 'Activity history could not be loaded.'); 
    }
    finally { 
      setLoading(false); 
    }
  }

  const carOptions = useMemo(() => [...new Map(events.filter(item => item.carId).map(item => [item.carId!, { id: item.carId!, label: item.carLabel || item.targetLabel || item.carId! }])).values()], [events]);
  const vendorOptions = useMemo(() => [...new Map(events.filter(item => item.vendorId).map(item => [item.vendorId!, { id: item.vendorId!, label: item.vendorName || item.vendorId! }])).values()], [events]);
  const visibleEvents = useMemo(() => events.filter(item => (targetType === 'all' || item.targetType === targetType) && (carId === 'all' || item.carId === carId) && (vendorId === 'all' || item.vendorId === vendorId)), [events, targetType, carId, vendorId]);
  
  const visibleClients = clients.filter(client => {
    const query = search.toLowerCase();
    return (
      (client.name || '').toLowerCase().includes(query) ||
      (client.email || '').toLowerCase().includes(query) ||
      (client.phone || '').includes(query) ||
      (client.city || '').toLowerCase().includes(query)
    );
  });

  const getEventIcon = (item: Event) => {
    if (item.action === 'buy_lead_captured') return <UserCheck size={17} style={{ color: '#16a34a' }} />;
    if (item.action === 'inspection_view') return <ShieldCheck size={17} style={{ color: '#0284c7' }} />;
    if (item.action === 'report_download') return <FileText size={17} style={{ color: '#7c3aed' }} />;
    if (item.action === 'button_click') return <MousePointerClick size={17} style={{ color: '#ea580c' }} />;
    if (item.action === 'emi_calculate') return <Landmark size={17} style={{ color: '#059669' }} />;
    if (item.action === 'test_drive') return <Calendar size={17} style={{ color: '#2563eb' }} />;
    if (item.action === 'reveal_phone') return <Phone size={17} style={{ color: '#16a34a' }} />;
    if (item.action === 'contact_dealer' || item.action === 'inquiry') return <MessageSquare size={17} style={{ color: '#16a34a' }} />;
    if (item.action === 'wishlist_add' || item.action === 'wishlist_remove') return <Heart size={17} style={{ color: '#ef4444' }} />;
    if (item.targetType === 'vendor') return <Store size={17} />;
    if (item.targetType === 'car') return <CarFront size={17} />;
    return <Search size={17} />;
  };

  if (selected) {
    const isLead = Boolean(selected.isLeadSession || selected.userId.startsWith('lead_') || selected.userId.startsWith('guest_'));
    return (
      <section className="user-history-detail">
        <div className="management-section-heading management-list-heading">
          <div>
            <button className="history-back" onClick={() => { setSelected(null); setEvents([]); setError(''); }}>
              <ArrowLeft size={15}/> All sessions &amp; leads
            </button>
            <span className="eyebrow">USER SESSION TELEMETRY</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <h2 style={{ margin: 0 }}>{selected.name || (selected.phone ? `Lead (${selected.phone})` : 'Visitor')}</h2>
              {isLead ? (
                <span style={{ fontSize: '12px', background: '#ffedd5', color: '#c2410c', padding: '3px 10px', borderRadius: '999px', fontWeight: 800 }}>
                  Lead Session (No Login)
                </span>
              ) : (
                <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '999px', fontWeight: 800 }}>
                  Google Member
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', fontSize: '13px', color: '#475569', marginTop: '6px' }}>
              {selected.phone && <span style={{ fontWeight: 700, color: '#0f172a' }}>📱 +91 {selected.phone}</span>}
              {selected.city && <span style={{ fontWeight: 600 }}>📍 {selected.city}</span>}
              {selected.email && !selected.email.endsWith('@lead.cars21.com') && <span>✉️ {selected.email}</span>}
              <span>· <b>{selected.totalCount}</b> user action records</span>
            </div>
          </div>
          <span className="history-last-seen">
            <Clock3 size={14}/> Last active {new Date(selected.lastSeen).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>

        <form className="history-filters" onSubmit={loadEvents}>
          <label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label>
          <label>To<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label>
          <label>Activity
            <select value={targetType} onChange={event => { setTargetType(event.target.value); setCarId('all'); setVendorId('all'); }}>
              <option value="all">All activity</option>
              <option value="car">By car</option>
              <option value="vendor">By dealer</option>
              <option value="inspection">Diagnostics &amp; Reports</option>
              <option value="emi">Loan &amp; EMI</option>
              <option value="search">Searches</option>
              <option value="lead">Lead Captures</option>
            </select>
          </label>
          {targetType === 'car' && (
            <label>Car
              <select value={carId} onChange={event => setCarId(event.target.value)}>
                <option value="all">All cars</option>
                {carOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          )}
          {targetType === 'vendor' && (
            <label>Dealer
              <select value={vendorId} onChange={event => setVendorId(event.target.value)}>
                <option value="all">All dealers</option>
                {vendorOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          )}
          <button className="management-primary compact" disabled={loading}>
            <Search size={15}/>{loading ? 'Loading…' : 'Apply dates'}
          </button>
        </form>

        {error && <div className="management-banner error" role="alert">{error}</div>}

        <div className="history-event-list">
          {visibleEvents.map(item => (
            <article className="history-event" key={item.id}>
              <span className="history-event-icon">
                {getEventIcon(item)}
              </span>
              <div>
                <b>{actionLabels[item.action] || item.action}</b>
                <span>{item.targetLabel || item.carLabel || item.vendorName || 'Cars21 activity'}</span>
                {item.details && item.details !== item.targetLabel && (
                  <small style={{ color: '#475569', display: 'block', marginTop: '2px' }}>
                    {item.details}
                  </small>
                )}
                {item.vendorName && item.carId && <small>Dealer · {item.vendorName}</small>}
              </div>
              <time>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time>
            </article>
          ))}
          {!loading && !visibleEvents.length && (
            <div className="management-empty">
              <History size={24}/>
              <b>No matching activity</b>
              <span>Try another date range or activity filter.</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="user-history-page">
      <div className="management-section-heading management-list-heading">
        <div>
          <span className="eyebrow">BUYER ACTIVITY &amp; SESSION RECORDS</span>
          <h2>User Sessions &amp; Leads</h2>
          <p>
            Track each buyer&apos;s journey, submitted lead forms, button clicks, viewed cars, inspection reports, loan calculations, and dealer contacts without mandatory login.
          </p>
        </div>
        <span className="history-client-count">
          <UserRound size={16}/>{clients.length} active sessions
        </span>
      </div>

      <div className="history-tabs" role="tablist" aria-label="Activity period">
        <button 
          className={bucket === 'recent' ? 'active' : ''} 
          role="tab" 
          aria-selected={bucket === 'recent'} 
          onClick={() => setBucket('recent')}
        >
          <Clock3 size={15}/> Recent <small>Last 7 days</small>
        </button>
        <button 
          className={bucket === 'history' ? 'active' : ''} 
          role="tab" 
          aria-selected={bucket === 'history'} 
          onClick={() => setBucket('history')}
        >
          <History size={15}/> History <small>7+ days</small>
        </button>
      </div>

      <label className="management-search history-search">
        <Search size={16}/>
        <input 
          value={search} 
          onChange={event => setSearch(event.target.value)} 
          placeholder="Find session by lead name, mobile number, city, or email" 
          aria-label="Find session by lead name, mobile number, city, or email"
        />
      </label>

      {error && <div className="management-banner error" role="alert">{error}</div>}

      <div className="history-client-list">
        {visibleClients.map(client => {
          const isLead = Boolean(client.isLeadSession || client.userId.startsWith('lead_') || client.userId.startsWith('guest_'));
          return (
            <article className="history-client-row" key={client.userId}>
              <span className="history-client-avatar">
                {isLead ? <UserCheck size={17} style={{ color: '#ea580c' }} /> : <UserRound size={17} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => { 
                      setSelected(client); 
                      setTargetType('all'); 
                      setFrom(''); 
                      setTo(''); 
                      setCarId('all'); 
                      setVendorId('all'); 
                    }}
                    style={{ fontWeight: 750, textAlign: 'left', color: '#0f172a' }}
                  >
                    {client.name || (client.phone ? `Lead (${client.phone})` : 'Cars21 Visitor')}
                  </button>
                  {isLead ? (
                    <span style={{ fontSize: '11px', background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                      Lead Form (No Login)
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                      Google Member
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  {client.phone && <span style={{ fontWeight: 700, color: '#1e293b' }}>📱 +91 {client.phone}</span>}
                  {client.city && <span style={{ fontWeight: 600 }}>📍 {client.city}</span>}
                  {client.email && !client.email.endsWith('@lead.cars21.com') && <span>✉️ {client.email}</span>}
                </div>
              </div>
              <span className="history-activity-count">
                <b>{bucket === 'history' ? client.historyCount : client.recentCount}</b>
                <small>{bucket === 'history' ? 'history actions' : 'recent actions'}</small>
              </span>
              <time>
                <CalendarDays size={14}/>
                {new Date(client.lastSeen).toLocaleDateString('en-IN')}
              </time>
            </article>
          );
        })}
        {!loading && !visibleClients.length && (
          <div className="management-empty">
            <History size={24}/>
            <b>{search ? 'No client sessions match' : bucket === 'history' ? 'No older sessions yet' : 'No recent sessions yet'}</b>
            <span>Lead captures and buyer actions will appear here automatically.</span>
          </div>
        )}
      </div>
    </section>
  );
}
