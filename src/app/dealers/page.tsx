import type { Metadata } from 'next';
import { ArrowRight, MapPin, Search, Store } from 'lucide-react';
import { Link } from '../../lib/navigation';
import { getPublicVendorDirectory } from '../../server/public-vendors';
import { MobileBottomNav, SiteFooter, SiteHeader } from '../../App';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Used car dealers and sellers in India | Cars21',
  description: 'Find used-car dealers by city, area and car model. Compare active inventory and explore verified Cars21 dealer profiles.',
  alternates: { canonical: '/dealers' },
  robots: { index: true, follow: true },
};

type Props = { searchParams: Promise<{ city?: string; area?: string; car?: string }> };

export default async function DealerDirectoryPage({ searchParams }: Props) {
  const filters = await searchParams;
  const vendors = await getPublicVendorDirectory().catch(() => []);
  const city = (filters.city || '').trim(); const area = (filters.area || '').trim(); const car = (filters.car || '').trim();
  const cities = [...new Set(vendors.flatMap(vendor => [vendor.city, ...vendor.cities]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const areas = [...new Set(vendors.flatMap(vendor => vendor.areas).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const shown = vendors.filter(vendor => (!city || vendor.city.toLowerCase() === city.toLowerCase() || vendor.cities.some(value=>value.toLowerCase()===city.toLowerCase())) && (!area || vendor.areas.some(value=>value.toLowerCase()===area.toLowerCase())) && (!car || vendor.models.some(value=>value.toLowerCase().includes(car.toLowerCase()))));
  return <><SiteHeader/><main id="main-content" className="dealer-directory-page">
    <section className="page-hero"><div className="container"><span className="eyebrow">CARS21 DEALER DIRECTORY</span><h1>Find trusted local dealers and the cars they list.</h1><p>Search active dealer inventory by location or model, then open a dealer profile to compare every available car.</p></div></section>
    <section className="container dealer-directory-content"><form className="dealer-directory-filters" action="/dealers" method="get"><label><span>City</span><select name="city" defaultValue={city}><option value="">All cities</option>{cities.map(value=><option key={value}>{value}</option>)}</select></label><label><span>Area</span><select name="area" defaultValue={area}><option value="">All areas</option>{areas.map(value=><option key={value}>{value}</option>)}</select></label><label className="dealer-model-filter"><span>Car make or model</span><input type="search" name="car" defaultValue={car} placeholder="e.g. Honda City"/></label><button className="button button-primary" type="submit"><Search size={16}/> Find dealers</button>{(city||area||car)&&<Link className="dealer-clear-filters" href="/dealers">Clear filters</Link>}</form>
      <div className="dealer-directory-heading"><div><span className="eyebrow">LIVE DEALER INVENTORY</span><h2>{city||area||car?'Matching dealers':'Dealers with active listings'}</h2></div><span>{shown.length} {shown.length === 1 ? 'dealer' : 'dealers'}</span></div>
      {shown.length ? <div className="dealer-directory-grid">{shown.map(vendor => <Link className="dealer-directory-card" href={`/dealers/${vendor.slug}`} key={vendor.id}><span className="dealer-directory-icon"><Store size={21}/></span><span className="dealer-directory-copy"><b>{vendor.businessName}</b><small>{vendor.name}</small><span><MapPin size={13}/>{vendor.city} · {vendor.listingCount} {vendor.listingCount === 1 ? 'car' : 'cars'}</span></span><ArrowRight size={17}/></Link>)}</div> : <div className="dealer-profile-empty"><Store size={24}/><h3>{vendors.length?'No dealers match those filters':'No dealer listings available yet'}</h3><p>{vendors.length?'Try a different city, area or model.':'Approved dealer vehicles will appear here automatically.'}</p><Link className="button button-dark" href="/buy-cars">Browse all cars <ArrowRight size={16}/></Link></div>}
    </section>
  </main><MobileBottomNav/><SiteFooter/></>;
}
