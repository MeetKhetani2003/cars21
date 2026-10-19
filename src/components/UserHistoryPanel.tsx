'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, CalendarDays, CarFront, Clock3, History, Search, Store, UserRound } from 'lucide-react';

type Client = { userId: string; name: string; email: string; lastSeen: string; recentCount: number; historyCount: number; totalCount: number };
type Event = { id: string; action: string; targetType: string; targetLabel?: string; carId?: string; carLabel?: string; vendorId?: string; vendorName?: string; createdAt: string };
const actionLabels: Record<string, string> = { search: 'Searched Cars21', car_view: 'Viewed a car', vendor_view: 'Opened a dealer page', vendor_save: 'Saved a dealer', vendor_unsave: 'Removed a saved dealer', reveal_phone: 'Revealed a contact number', inquiry: 'Sent a car enquiry', wishlist_add: 'Added a car to wishlist', wishlist_remove: 'Removed a car from wishlist' };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'History could not be loaded.');
  return result as T;
}

export function UserHistoryPanel() {
  const [bucket, setBucket] = useState<'history' | 'recent'>('history');
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
    try { const result = await getJson<{ clients: Client[] }>(`/api/admin/user-history?mode=users&bucket=${nextBucket}`); setClients(result.clients); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'History could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadClients(bucket); }, [bucket]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true); setError('');
    const params = new URLSearchParams({ mode: 'events', bucket, userId: selected.userId });
    void getJson<{ events: Event[] }>(`/api/admin/user-history?${params}`).then(result => { if (active) setEvents(result.events); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Activity history could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, bucket]);

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
    try { const result = await getJson<{ events: Event[] }>(`/api/admin/user-history?${params}`); setEvents(result.events); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Activity history could not be loaded.'); }
    finally { setLoading(false); }
  }

  const carOptions = useMemo(() => [...new Map(events.filter(item => item.carId).map(item => [item.carId!, { id: item.carId!, label: item.carLabel || item.targetLabel || item.carId! }])).values()], [events]);
  const vendorOptions = useMemo(() => [...new Map(events.filter(item => item.vendorId).map(item => [item.vendorId!, { id: item.vendorId!, label: item.vendorName || item.vendorId! }])).values()], [events]);
  const visibleEvents = useMemo(() => events.filter(item => (targetType === 'all' || item.targetType === targetType) && (carId === 'all' || item.carId === carId) && (vendorId === 'all' || item.vendorId === vendorId)), [events, targetType, carId, vendorId]);
  const visibleClients = clients.filter(client => `${client.name} ${client.email}`.toLowerCase().includes(search.toLowerCase()));

  if (selected) return <section className="user-history-detail">
    <div className="management-section-heading management-list-heading"><div><button className="history-back" onClick={() => { setSelected(null); setEvents([]); setError(''); }}><ArrowLeft size={15}/> All clients</button><span className="eyebrow">CLIENT ACTIVITY</span><h2>{selected.name}</h2><p>{selected.email} · {selected.totalCount} total actions</p></div><span className="history-last-seen"><Clock3 size={14}/> Last active {new Date(selected.lastSeen).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
    <form className="history-filters" onSubmit={loadEvents}><label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>To<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label><label>Activity<select value={targetType} onChange={event => { setTargetType(event.target.value); setCarId('all'); setVendorId('all'); }}><option value="all">All activity</option><option value="car">By car</option><option value="vendor">By dealer</option><option value="search">Searches</option></select></label>{targetType === 'car' && <label>Car<select value={carId} onChange={event => setCarId(event.target.value)}><option value="all">All cars</option>{carOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}{targetType === 'vendor' && <label>Dealer<select value={vendorId} onChange={event => setVendorId(event.target.value)}><option value="all">All dealers</option>{vendorOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}<button className="management-primary compact" disabled={loading}><Search size={15}/>{loading ? 'Loading…' : 'Apply dates'}</button></form>
    {error && <div className="management-banner error" role="alert">{error}</div>}
    <div className="history-event-list">{visibleEvents.map(item => <article className="history-event" key={item.id}><span className="history-event-icon">{item.targetType === 'vendor' ? <Store size={17}/> : item.targetType === 'car' ? <CarFront size={17}/> : <Search size={17}/>}</span><div><b>{actionLabels[item.action] || item.action}</b><span>{item.targetLabel || item.carLabel || item.vendorName || 'Cars21 activity'}</span>{item.vendorName && item.carId && <small>Dealer · {item.vendorName}</small>}</div><time>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time></article>)}{!loading && !visibleEvents.length && <div className="management-empty"><History size={24}/><b>No matching activity</b><span>Try another date range or activity filter.</span></div>}</div>
  </section>;

  return <section className="user-history-page">
    <div className="management-section-heading management-list-heading"><div><span className="eyebrow">BUYER PRIVACY &amp; ACTIVITY</span><h2>User history</h2><p>Searches, car and dealer page views, enquiries, and phone reveals. Recent activity moves into history automatically after seven days.</p></div><span className="history-client-count"><UserRound size={16}/>{clients.length} clients</span></div>
    <div className="history-tabs" role="tablist" aria-label="Activity period"><button className={bucket === 'history' ? 'active' : ''} role="tab" aria-selected={bucket === 'history'} onClick={() => setBucket('history')}><History size={15}/> History <small>7+ days</small></button><button className={bucket === 'recent' ? 'active' : ''} role="tab" aria-selected={bucket === 'recent'} onClick={() => setBucket('recent')}><Clock3 size={15}/> Recent <small>Last 7 days</small></button></div>
    <label className="management-search history-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a client by name or email" aria-label="Find a client by name or email"/></label>
    {error && <div className="management-banner error" role="alert">{error}</div>}
    <div className="history-client-list">{visibleClients.map(client => <article className="history-client-row" key={client.userId}><span className="history-client-avatar"><UserRound size={17}/></span><div><button onClick={() => { setSelected(client); setTargetType('all'); setFrom(''); setTo(''); setCarId('all'); setVendorId('all'); }}>{client.name || 'Cars21 client'}</button><small>{client.email}</small></div><span className="history-activity-count"><b>{bucket === 'history' ? client.historyCount : client.recentCount}</b><small>{bucket === 'history' ? 'history actions' : 'recent actions'}</small></span><time><CalendarDays size={14}/>{new Date(client.lastSeen).toLocaleDateString('en-IN')}</time></article>)}{!loading && !visibleClients.length && <div className="management-empty"><History size={24}/><b>{search ? 'No clients match' : bucket === 'history' ? 'No older activity yet' : 'No recent activity yet'}</b><span>Signed-in buyer actions will appear here.</span></div>}</div>
  </section>;
}
