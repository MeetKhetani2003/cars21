'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, CalendarClock, CarFront, Check, CircleDollarSign, Edit3, Layers3, Plus, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { formatINR } from '../data';

type Features = { listingAnalytics: boolean; buyerInquiries: boolean; inspectionUploads: boolean; publicBusinessProfile: boolean; priorityPlacement: boolean };
type Plan = { id: string; name: string; description: string; price: number; durationDays: number; maxListings: number; maxImagesPerListing: number; features: Features; active: boolean; public: boolean };
type Vendor = { id: string; name: string; email: string; city: string; status: string };
type Assignment = { vendorId: string; planId: string; planName?: string; status: string; startAt: string; endAt: string; vendor?: Vendor; plan?: Plan };
const emptyFeatures: Features = { listingAnalytics: true, buyerInquiries: true, inspectionUploads: true, publicBusinessProfile: true, priorityPlacement: false };
const featureHelp: { key: keyof Features; title: string; note: string }[] = [
  { key: 'buyerInquiries', title: 'Buyer enquiries', note: 'Accept leads from vehicle detail pages and forward them by WhatsApp.' },
  { key: 'inspectionUploads', title: 'Inspection uploads', note: 'Attach condition notes and evidence photos for Cars21 review.' },
  { key: 'listingAnalytics', title: 'Listing analytics', note: 'See listing and enquiry totals in the vendor workspace.' },
  { key: 'publicBusinessProfile', title: 'Public dealer page', note: 'Show business details, showroom photos, and active vehicles.' },
  { key: 'priorityPlacement', title: 'Priority placement', note: 'Flag listings for the Cars21 team to prioritize in merchandising.' },
];
const blankPlan = { name: '', description: '', price: 0, durationDays: 30, maxListings: 5, maxImagesPerListing: 10, features: emptyFeatures, active: true, public: true };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The subscription request failed.');
  return body as T;
}

export function SubscriptionManager({ view }: { view: 'plans' | 'subscriptions' }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [draft, setDraft] = useState(blankPlan);
  const [editingId, setEditingId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [planId, setPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingVendorId, setCancellingVendorId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const result = await request<{ plans: Plan[]; vendors: Vendor[]; subscriptions: Assignment[] }>('/api/superadmin/subscriptions');
      setPlans(result.plans); setVendors(result.vendors); setAssignments(result.subscriptions);
      if (!planId && result.plans[0]) setPlanId(result.plans.find(plan => plan.active)?.id || result.plans[0].id);
      if (!vendorId && result.vendors[0]) setVendorId(result.vendors.find(vendor => vendor.status === 'active')?.id || result.vendors[0].id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Subscription data could not be loaded.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function edit(plan: Plan) {
    setEditingId(plan.id); setDraft({ name: plan.name, description: plan.description || '', price: plan.price, durationDays: plan.durationDays, maxListings: plan.maxListings, maxImagesPerListing: plan.maxImagesPerListing, features: { ...emptyFeatures, ...plan.features }, active: plan.active, public: plan.public });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      if (editingId) await request(`/api/superadmin/plans/${encodeURIComponent(editingId)}`, { method: 'PATCH', body: JSON.stringify(draft) });
      else await request('/api/superadmin/plans', { method: 'POST', body: JSON.stringify(draft) });
      setNotice(editingId ? 'Plan updated. Active assignments now use the revised limits.' : 'Subscription plan created.'); setEditingId(''); setDraft(blankPlan); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Plan could not be saved.'); }
    finally { setSaving(false); }
  }

  async function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try { await request('/api/superadmin/subscriptions', { method: 'POST', body: JSON.stringify({ vendorId, planId }) }); setNotice('Subscription assigned. The vendor workspace now shows its term and plan limits.'); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Subscription could not be assigned.'); }
    finally { setSaving(false); }
  }
  async function cancel(vendor:Vendor){if(!window.confirm(`Cancel the active subscription for ${vendor.name}?`))return;setCancellingVendorId(vendor.id);setError('');setNotice('');try{await request('/api/superadmin/subscriptions',{method:'PATCH',body:JSON.stringify({vendorId:vendor.id,action:'cancel'})});setNotice(`${vendor.name}'s subscription was cancelled.`);await load()}catch(reason){setError(reason instanceof Error?reason.message:'Subscription could not be cancelled.')}finally{setCancellingVendorId('')}}

  const showPlans = view === 'plans';
  return <section className="subscription-manager">
    <div className="management-section-heading management-list-heading"><div><span className="eyebrow">DEALER COMMERCIALS</span><h2>{showPlans ? 'Subscription plans' : 'Vendor subscriptions'}</h2><p>{showPlans ? 'Set price, listing and image capacity, subscription length, and included tools.' : 'Assign a plan to an active dealer and see the current subscription term.'}</p></div><button className="management-secondary" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {error && <p className="management-error" role="alert">{error}</p>}{notice && <p className="buyer-profile-success" role="status">{notice}</p>}
    {showPlans ? <>
      <form className="subscription-plan-form" onSubmit={savePlan}>
        <div className="subscription-form-title"><span className="management-icon blue"><Layers3 size={18}/></span><div><b>{editingId ? 'Edit plan' : 'Create a plan'}</b><small>Limits apply to a dealer while this plan is active.</small></div></div>
        <div className="management-form-pair"><label className="management-field">Plan name<input required maxLength={80} value={draft.name} onChange={e=>setDraft({ ...draft, name:e.target.value })} placeholder="Growth"/></label><label className="management-field">Monthly / term price (₹)<input required type="number" min="0" value={draft.price} onChange={e=>setDraft({ ...draft, price:Number(e.target.value) })}/></label></div>
        <label className="management-field">What this plan is for<textarea maxLength={400} rows={2} value={draft.description} onChange={e=>setDraft({ ...draft, description:e.target.value })} placeholder="A short explanation vendors see on pricing."/></label>
        <div className="management-form-pair"><label className="management-field">Term (days)<input type="number" min="1" max="3650" value={draft.durationDays} onChange={e=>setDraft({ ...draft, durationDays:Number(e.target.value) })}/><small>Vendor expiry is calculated from the assignment date.</small></label><label className="management-field">Maximum live listings<input type="number" min="1" max="10000" value={draft.maxListings} onChange={e=>setDraft({ ...draft, maxListings:Number(e.target.value) })}/><small>Listings already created remain saved when the plan changes.</small></label></div>
        <label className="management-field">Maximum photos per listing<input type="number" min="1" max="20" value={draft.maxImagesPerListing} onChange={e=>setDraft({ ...draft, maxImagesPerListing:Math.min(20,Number(e.target.value)) })}/><small>20 is the platform limit; inspection evidence uses this allowance too.</small></label>
        <div className="subscription-feature-options"><b>Included features</b>{featureHelp.map(feature=><label key={feature.key}><input type="checkbox" checked={draft.features[feature.key]} onChange={e=>setDraft({ ...draft, features:{ ...draft.features, [feature.key]:e.target.checked } })}/><span><strong>{feature.title}</strong><small>{feature.note}</small></span></label>)}</div>
        <div className="subscription-plan-switches"><label><input type="checkbox" checked={draft.active} onChange={e=>setDraft({ ...draft, active:e.target.checked })}/> Available for assignment</label><label><input type="checkbox" checked={draft.public} onChange={e=>setDraft({ ...draft, public:e.target.checked })}/> Show on public pricing page</label></div>
        <div className="management-form-actions">{editingId && <button type="button" className="management-secondary" onClick={()=>{setEditingId('');setDraft(blankPlan)}}>Cancel edit</button>}<button className="management-primary" disabled={saving}>{saving?'Saving…':editingId?'Save plan':'Create plan'} <Check size={16}/></button></div>
      </form>
      <div className="subscription-plan-grid">{plans.map(plan=><article key={plan.id} className="subscription-plan-card"><div className="subscription-plan-top"><span className="management-icon blue"><CircleDollarSign size={18}/></span><span className={`management-status ${plan.active?'active':'paused'}`}>{plan.active?'Assignable':'Paused'}</span></div><h3>{plan.name}</h3><p>{plan.description || 'Dealer subscription plan'}</p><div className="subscription-price">{formatINR(plan.price)}<small> / {plan.durationDays} days</small></div><div className="subscription-plan-capacities"><span><CarFront size={14}/>{plan.maxListings} listings</span><span><Sparkles size={14}/>{plan.maxImagesPerListing} photos per car</span></div><ul>{featureHelp.filter(feature=>plan.features?.[feature.key]).map(feature=><li key={feature.key}><Check size={14}/>{feature.title}</li>)}</ul><button className="management-secondary" onClick={()=>edit(plan)}><Edit3 size={14}/> Edit plan</button></article>)}{!plans.length&&!loading&&<div className="management-empty"><Layers3 size={25}/><b>No plans created yet</b><span>Create a plan, then assign it to a dealer.</span></div>}</div>
    </> : <>
      <form className="subscription-assign-form" onSubmit={assign}><div className="subscription-form-title"><span className="management-icon green"><Store size={18}/></span><div><b>Assign or renew a subscription</b><small>New assignment replaces the vendor’s currently active term.</small></div></div><div className="management-form-pair"><label className="management-field">Dealer<select required value={vendorId} onChange={e=>setVendorId(e.target.value)}><option value="">Select vendor</option>{vendors.filter(vendor=>vendor.status==='active').map(vendor=><option key={vendor.id} value={vendor.id}>{vendor.name} · {vendor.city}</option>)}</select></label><label className="management-field">Active plan<select required value={planId} onChange={e=>setPlanId(e.target.value)}><option value="">Select plan</option>{plans.filter(plan=>plan.active).map(plan=><option key={plan.id} value={plan.id}>{plan.name} · {formatINR(plan.price)} / {plan.durationDays} days</option>)}</select></label></div><button className="management-primary" disabled={saving||!vendors.length||!plans.some(plan=>plan.active)}>{saving?'Assigning…':'Assign plan'} <Check size={16}/></button></form>
      <div className="subscription-assignment-list">{assignments.map((item,index)=><article key={`${item.vendorId}-${item.planId}-${item.startAt}-${index}`}><span className="management-icon blue"><CalendarClock size={18}/></span><div className="subscription-assignment-copy"><b>{item.vendor?.name || 'Dealer'}</b><span>{item.plan?.name || item.planName || 'Plan unavailable'} · {item.vendor?.city || ''}</span><small>{new Date(item.startAt).toLocaleDateString('en-IN')} – {new Date(item.endAt).toLocaleDateString('en-IN')}</small></div><span className={`management-status ${item.status==='active'&&new Date(item.endAt).getTime()>Date.now()?'active':'paused'}`}>{item.status==='active'&&new Date(item.endAt).getTime()>Date.now()?'Active':item.status==='cancelled'?'Cancelled':'Expired'}</span>{item.status==='active'&&item.vendor&&<button className="management-secondary danger" disabled={cancellingVendorId===item.vendor.id} onClick={()=>void cancel(item.vendor!)}>{cancellingVendorId===item.vendor.id?'Cancelling…':'Cancel'}</button>}</article>)}{!assignments.length&&!loading&&<div className="management-empty"><ShieldCheck size={25}/><b>No subscriptions assigned</b><span>Assign an active plan to enable vendor listing and inspection uploads.</span></div>}</div>
    </>}
    {loading&&<p className="management-loading-inline">Loading subscription data…</p>}
    {showPlans&&<p className="subscription-feature-footnote"><BadgeCheck size={14}/> Subscription limits are enforced by the listing API; plan edits apply to vendors next time their workspace refreshes.</p>}
  </section>;
}
