'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CarFront, CircleHelp, ClipboardList, MapPin, MessageSquareText } from 'lucide-react';
import { Link } from '../lib/navigation';
import { formatINR } from '../data';

type Inquiry = { id: string; createdAt: string; status: string; client?: { name?: string; phone?: string; email?: string; city?: string; message?: string; preferredDate?: string } };
type Listing = { id: string; make: string; model: string; variant?: string; year: number; km: number; price: number; city: string; area?: string; status?: string; inquiries: Inquiry[] };
type Workspace = { approved: boolean; applicationStatus: string; listings: Listing[] };
const initialForm = { make: '', model: '', variant: '', year: String(new Date().getFullYear()), km: '', fuel: 'Petrol', transmission: 'Manual', owners: '1', price: '', city: '', area: '', body: 'Hatchback', color: '', phone: '', description: '' };

export function SellerListingsPanel() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function refresh() {
    const response = await fetch('/api/user/seller-listings', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Seller workspace could not be loaded.');
    setWorkspace({ approved: Boolean(result.approved), applicationStatus: String(result.applicationStatus || 'none'), listings: Array.isArray(result.listings) ? result.listings : [] });
  }
  useEffect(() => { let alive = true; fetch('/api/user/seller-listings', { credentials: 'same-origin', cache: 'no-store' }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Seller workspace could not be loaded.'); if (alive) setWorkspace({ approved: Boolean(result.approved), applicationStatus: String(result.applicationStatus || 'none'), listings: Array.isArray(result.listings) ? result.listings : [] }); }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : 'Seller workspace could not be loaded.'); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true);
    try { const response = await fetch('/api/user/seller-listings', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Listing could not be submitted.'); setForm(initialForm); setShowForm(false); setNotice('Car submitted. Cars21 staff will review it before it appears in search.'); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Listing could not be submitted.'); }
    finally { setSaving(false); }
  }
  if (loading) return <section className="buyer-profile-panel seller-listings-loading"><span className="loading-spinner"/>Checking seller access…</section>;
  if (!workspace?.approved) return null;
  return <section className="buyer-profile-panel seller-listings-panel">
    <div className="buyer-panel-heading"><div><span className="eyebrow">VERIFIED PRIVATE SELLER</span><h2>My listings <span>{workspace.listings.length}</span></h2><p>Cars21 reviews each car before it goes live. Buyer enquiries for your cars appear here.</p></div><button type="button" className="button button-primary" onClick={() => setShowForm(value => !value)}><CarFront size={16}/>{showForm ? 'Close form' : 'Add a car'}</button></div>
    {error && <p className="management-error" role="alert">{error}</p>}{notice && <p className="buyer-profile-success" role="status">{notice}</p>}
    {showForm && <form className="seller-listing-form" onSubmit={submit}><div className="seller-form-grid">
      <label className="field-label">Make<input required minLength={2} maxLength={60} value={form.make} onChange={e=>setForm(v=>({...v,make:e.target.value}))} placeholder="Honda"/></label>
      <label className="field-label">Model<input required maxLength={80} value={form.model} onChange={e=>setForm(v=>({...v,model:e.target.value}))} placeholder="City"/></label>
      <label className="field-label">Variant<input maxLength={120} value={form.variant} onChange={e=>setForm(v=>({...v,variant:e.target.value}))} placeholder="ZX CVT"/></label>
      <label className="field-label">Year<input type="number" required min="1980" max="2100" value={form.year} onChange={e=>setForm(v=>({...v,year:e.target.value}))}/></label>
      <label className="field-label">Kilometres driven<input type="number" required min="0" max="2000000" value={form.km} onChange={e=>setForm(v=>({...v,km:e.target.value}))}/></label>
      <label className="field-label">Asking price (₹)<input type="number" required min="1" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))}/></label>
      <label className="field-label">Fuel<select value={form.fuel} onChange={e=>setForm(v=>({...v,fuel:e.target.value}))}>{['Petrol','Diesel','CNG','Electric','Hybrid'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="field-label">Transmission<select value={form.transmission} onChange={e=>setForm(v=>({...v,transmission:e.target.value}))}>{['Manual','Automatic'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="field-label">Owners<input type="number" required min="1" max="10" value={form.owners} onChange={e=>setForm(v=>({...v,owners:e.target.value}))}/></label>
      <label className="field-label">City<input required minLength={2} maxLength={60} value={form.city} onChange={e=>setForm(v=>({...v,city:e.target.value}))} placeholder="Bengaluru"/></label>
      <label className="field-label">Area<input maxLength={80} value={form.area} onChange={e=>setForm(v=>({...v,area:e.target.value}))} placeholder="Indiranagar"/></label>
      <label className="field-label">Body type<select value={form.body} onChange={e=>setForm(v=>({...v,body:e.target.value}))}>{['Hatchback','Sedan','SUV','MUV','Coupe','Electric'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="field-label">Colour<input maxLength={40} value={form.color} onChange={e=>setForm(v=>({...v,color:e.target.value}))}/></label>
      <label className="field-label">Contact number<input type="tel" maxLength={24} value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))} placeholder="Optional; profile number used by default"/></label>
      <label className="field-label seller-description-field">Car details<textarea maxLength={1200} rows={3} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Service history, condition, or other useful details"/></label>
    </div>{error && <p className="management-error" role="alert">{error}</p>}<button className="button button-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit for review'} <ArrowRight size={15}/></button><small className="field-help"><CircleHelp size={14}/> Your listing stays private until Cars21 approves the car.</small></form>}
    {workspace.listings.length ? <div className="seller-owned-listings">{workspace.listings.map(car=><article className="seller-owned-card" key={car.id}><div className="seller-owned-heading"><span className="seller-owned-icon"><CarFront size={20}/></span><div><h3>{car.year} {car.make} {car.model} {car.variant}</h3><p><MapPin size={13}/>{[car.area,car.city].filter(Boolean).join(', ')} · {car.km.toLocaleString('en-IN')} km</p></div><span className={`seller-car-status seller-car-status-${car.status||'pending'}`}>{car.status==='active'?'Live':car.status==='sold'?'Sold':car.status==='paused'?'Paused':'Under review'}</span></div><div className="seller-owned-meta"><b>{formatINR(car.price)}</b><Link to={`/car/${encodeURIComponent(car.id)}`}>View car <ArrowRight size={13}/></Link></div><div className="seller-buyer-inquiries"><div className="seller-inquiries-title"><MessageSquareText size={15}/><b>Buyer enquiries</b><span>{car.inquiries.length}</span></div>{car.inquiries.length ? car.inquiries.map(inquiry=><div className="seller-buyer-row" key={inquiry.id}><span className="seller-buyer-avatar">{(inquiry.client?.name||'B').slice(0,1).toUpperCase()}</span><div><b>{inquiry.client?.name||'Buyer'}</b><p>{[inquiry.client?.city,inquiry.client?.email].filter(Boolean).join(' · ')}</p>{inquiry.client?.message&&<small>“{inquiry.client.message}”</small>}</div><div className="seller-buyer-contact">{inquiry.client?.phone&&<a href={`tel:${inquiry.client.phone}`}>{inquiry.client.phone}</a>}<span>{inquiry.status||'new'} · {new Date(inquiry.createdAt).toLocaleDateString('en-IN')}</span></div></div>):<p className="seller-no-inquiries"><ClipboardList size={15}/> No buyer enquiries yet. They’ll appear here when someone contacts you.</p>}</div></article>)}</div> : !showForm && <div className="buyer-wishlist-empty"><CarFront size={23}/><b>No cars listed yet</b><span>Add a car to send it to Cars21 for review.</span><button type="button" className="button button-outline" onClick={()=>setShowForm(true)}>List my car <ArrowRight size={14}/></button></div>}
  </section>;
}
