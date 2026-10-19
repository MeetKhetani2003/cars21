'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, CarFront, Heart, MapPin, RefreshCw, Users } from 'lucide-react';
import { Link } from '../lib/navigation';
import { formatINR } from '../data';

type Demand = { carId: string; title: string; variant: string; city: string; price: number; status: string; image: string; vendorId: string; vendorName: string; vendorSlug: string; saves: number; uniqueBuyers: number; lastSaved: string | null };
export function WishlistInsights({ vendor = false }: { vendor?: boolean }) {
  const [items, setItems] = useState<Demand[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function load() { setLoading(true); setError(''); try { const response = await fetch('/api/admin/wishlist-insights', { credentials: 'same-origin', cache: 'no-store' }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Wishlist demand could not be loaded.'); setItems(result.items || []); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Wishlist demand could not be loaded.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const totalSaves = items.reduce((sum, item) => sum + item.saves, 0);
  return <section className="wishlist-insights">
    <div className="management-section-heading management-list-heading"><div><span className="eyebrow">BUYER INTEREST</span><h2>{vendor ? 'Demand for my cars' : 'Most wishlisted cars'}</h2><p>Cars buyers are saving right now. Wishlist totals show active saves from unique accounts.</p></div><button className="management-refresh wishlist-refresh" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/><span>{loading?'Updating…':'Refresh'}</span></button></div>
    <div className="wishlist-summary"><div><span><Heart size={16}/> Saved cars</span><b>{items.length}</b><small>with at least one active wishlist</small></div><div><span><Users size={16}/> Total buyer saves</span><b>{totalSaves}</b><small>current saved-car selections</small></div><div><span><CarFront size={16}/> Leading model</span><b>{items[0]?.title || '—'}</b><small>{items[0] ? `${items[0].saves} buyer saves` : 'No saves yet'}</small></div></div>
    {error && <div className="management-banner error" role="alert">{error}</div>}
    {loading ? <div className="management-empty"><span className="loading-spinner"/><b>Loading wishlist demand…</b></div> : items.length ? <div className="wishlist-demand-list">{items.map((item,index)=><article className="wishlist-demand-row" key={item.carId}><span className="wishlist-rank">{String(index+1).padStart(2,'0')}</span><img src={item.image || '/images/kars21-hero.png'} alt=""/><div className="wishlist-demand-car"><Link href={`/car/${item.carId}`}>{item.title}<ArrowUpRight size={13}/></Link><small>{item.variant || 'Listing'} · {formatINR(item.price)}</small><span><MapPin size={12}/>{item.city}</span></div><div className="wishlist-demand-vendor"><small>{vendor?'YOUR LISTING':'VENDOR'}</small>{!vendor && item.vendorSlug ? <Link href={`/dealers/${item.vendorSlug}`}>{item.vendorName}</Link> : <b>{item.vendorName}</b>}</div><div className="wishlist-demand-count"><b><Heart size={14} fill="currentColor"/>{item.saves}</b><small>{item.uniqueBuyers} unique {item.uniqueBuyers===1?'buyer':'buyers'}</small></div></article>)}</div> : <div className="management-empty"><Heart size={25}/><b>No wishlist demand yet</b><span>Buyer saves will appear here as shoppers add cars to their wishlists.</span></div>}
  </section>;
}
