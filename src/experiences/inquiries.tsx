'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight, LockKeyhole, MapPin, MessageCircle, Phone, RefreshCw, UserRound } from 'lucide-react';
import { Link } from '../lib/navigation';
import { formatINR } from '../data';

type Inquiry = {
  id: string;
  carId: string;
  createdAt: string;
  detailUrl: string;
  status: string;
  vehicle: { make: string; model: string; variant: string; year: number; price: number; city: string; sellerName: string; sellerPhone: string };
  client: { name: string; phone: string; email: string; city: string; message: string; preferredDate: string; preferredTime: string };
};

export function InquiryInbox() {
  const [token, setToken] = useState('');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function loadInquiries(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/inquiries', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'That admin token was not accepted.' : result.error || 'Could not load enquiries.');
      setInquiries(result.inquiries as Inquiry[]);
      setLoaded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load enquiries.');
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }

  return <section className="inquiry-inbox" aria-labelledby="inquiry-inbox-title">
    <div className="inbox-heading"><div><span className="eyebrow">BUYER LEADS · PRIVATE</span><h2 id="inquiry-inbox-title">Car enquiries</h2><p>Saved requests from visitors who booked a car visit or asked for a call.</p></div><span className="inbox-count">{loaded ? `${inquiries.length} recent` : 'Admin access'}</span></div>
    <form className="inbox-access" onSubmit={loadInquiries}>
      <label className="field-label"><span>Admin access token</span><input type="password" autoComplete="current-password" value={token} onChange={event=>setToken(event.target.value)} placeholder="Enter CARS21_ADMIN_TOKEN" required/></label>
      <button className="button button-primary" type="submit" disabled={loading}>{loading?'Loading…':loaded?<><RefreshCw size={15}/> Refresh leads</>:<><LockKeyhole size={15}/> View enquiries</>}</button>
    </form>
    {error&&<p className="inbox-error" role="alert">{error}</p>}
    {loaded&&inquiries.length===0&&<div className="inbox-empty"><MessageCircle size={20}/><b>No enquiries yet</b><span>New car requests will appear here as soon as a buyer submits one.</span></div>}
    {loaded&&inquiries.length>0&&<div className="inquiry-list">{inquiries.map(inquiry=><article className="inquiry-card" key={inquiry.id}>
      <div className="inquiry-card-top"><span className="inquiry-status">New enquiry</span><time dateTime={inquiry.createdAt}>{new Date(inquiry.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</time></div>
      <div className="inquiry-columns"><div className="inquiry-info"><span className="eyebrow">CAR</span><h3>{inquiry.vehicle.year} {inquiry.vehicle.make} {inquiry.vehicle.model}</h3><p>{inquiry.vehicle.variant}</p><div className="inquiry-meta"><span>{formatINR(inquiry.vehicle.price)}</span><span><MapPin size={13}/>{inquiry.vehicle.city}</span></div><small>Seller · {inquiry.vehicle.sellerName || 'Cars21 seller'}{inquiry.vehicle.sellerPhone?` · ${inquiry.vehicle.sellerPhone}`:''}</small><Link to={`/car/${encodeURIComponent(inquiry.carId)}`} className="inquiry-link">Open listing <ArrowUpRight size={14}/></Link></div>
      <div className="inquiry-info client-info"><span className="eyebrow">CLIENT</span><h3><UserRound size={16}/>{inquiry.client.name}</h3><a href={`tel:${inquiry.client.phone}`}><Phone size={14}/>{inquiry.client.phone}</a>{inquiry.client.email&&<a href={`mailto:${inquiry.client.email}`}>{inquiry.client.email}</a>}<p><MapPin size={14}/>{inquiry.client.city}</p><p><MessageCircle size={14}/>{inquiry.client.preferredDate?`${inquiry.client.preferredDate}${inquiry.client.preferredTime?` · ${inquiry.client.preferredTime}`:''}`:inquiry.client.preferredTime?`Flexible date · ${inquiry.client.preferredTime}`:'Callback / flexible'}</p>{inquiry.client.message&&<blockquote>{inquiry.client.message}</blockquote>}</div></div>
    </article>)}</div>}
    {!loaded&&<p className="inbox-privacy"><LockKeyhole size={14}/> Client contact details are private and visible only after server-side admin-token verification.</p>}
  </section>;
}
