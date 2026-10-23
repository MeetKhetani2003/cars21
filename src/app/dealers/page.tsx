import type { Metadata } from 'next';
import { ArrowRight, MapPin, Search, Store, ShieldCheck, Sparkles, Building2, CarFront } from 'lucide-react';
import { Link } from '../../lib/navigation';
import { getPublicVendorDirectory } from '../../server/public-vendors';
import { MobileBottomNav, SiteFooter, SiteHeader } from '../../App';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Verified Used Car Dealers & Showrooms in India | Cars21',
  description: 'Find trusted used-car dealers by city, area, and car model. Compare live showroom inventory and explore verified Cars21 partner profiles.',
  alternates: { canonical: '/dealers' },
  robots: { index: true, follow: true },
};

type Props = { searchParams: Promise<{ city?: string; area?: string; car?: string }> };

export default async function DealerDirectoryPage({ searchParams }: Props) {
  const filters = await searchParams;
  const vendors = await getPublicVendorDirectory().catch(() => []);
  const city = (filters.city || '').trim(); 
  const area = (filters.area || '').trim(); 
  const car = (filters.car || '').trim();

  const cities = [...new Set(vendors.flatMap(vendor => [vendor.city, ...vendor.cities]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const areas = [...new Set(vendors.flatMap(vendor => vendor.areas).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const shown = vendors.filter(vendor => 
    (!city || vendor.city.toLowerCase() === city.toLowerCase() || vendor.cities.some(value=>value.toLowerCase()===city.toLowerCase())) && 
    (!area || vendor.areas.some(value=>value.toLowerCase()===area.toLowerCase())) && 
    (!car || vendor.models.some(value=>value.toLowerCase().includes(car.toLowerCase())))
  );

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="dealer-directory-page">
        {/* Luxury Hero Banner */}
        <section className="dealer-dir-hero">
          <div className="container">
            <div className="dealer-hero-badge">
              <ShieldCheck size={14} /> CARS21 ACCREDITED DEALER NETWORK
            </div>
            <h1 className="dealer-hero-title">Verified Car Showrooms &amp; Dealers</h1>
            <p className="dealer-hero-subtitle">
              Browse accredited multi-brand pre-owned dealerships. Every dealer in our network adheres to standardized 140-point diagnostics, transparent pricing, and instant paperwork transfer.
            </p>
            <div className="dealer-stat-strip">
              <div className="dealer-stat-item">
                <b>{vendors.length}+</b>
                <span>Partner Showrooms</span>
              </div>
              <div className="dealer-stat-sep" />
              <div className="dealer-stat-item">
                <b>100%</b>
                <span>Accredited Hubs</span>
              </div>
              <div className="dealer-stat-sep" />
              <div className="dealer-stat-item">
                <b>Pan-India</b>
                <span>City Coverage</span>
              </div>
            </div>
          </div>
        </section>

        {/* Directory Content & Filters */}
        <section className="container dealer-dir-content-wrap">
          {/* Omnibar Search Card */}
          <div className="dealer-omnibar-card">
            <form className="dealer-omnibar-form" action="/dealers" method="get">
              <div className="omnibar-field">
                <span className="field-caption"><MapPin size={13} /> City</span>
                <select name="city" defaultValue={city} className="omnibar-select">
                  <option value="">All Indian Cities</option>
                  {cities.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="omnibar-divider" />

              <div className="omnibar-field">
                <span className="field-caption"><Building2 size={13} /> Locality / Area</span>
                <select name="area" defaultValue={area} className="omnibar-select">
                  <option value="">All Localities</option>
                  {areas.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="omnibar-divider" />

              <div className="omnibar-field flex-grow">
                <span className="field-caption"><CarFront size={13} /> Preferred Car or Model</span>
                <input 
                  type="search" 
                  name="car" 
                  defaultValue={car} 
                  placeholder="e.g. Honda City, Creta, Swift..."
                  className="omnibar-input"
                />
              </div>

              <button className="button button-orange dealer-omnibar-submit" type="submit">
                <Search size={16} /> Find Showrooms
              </button>

              {(city || area || car) && (
                <Link className="button button-outline dealer-clear-btn" href="/dealers">
                  Reset
                </Link>
              )}
            </form>
          </div>

          {/* Directory Heading */}
          <div className="dealer-results-header">
            <div>
              <span className="eyebrow">SHOWROOM DIRECTORY</span>
              <h2>{city || area || car ? 'Matching Dealerships' : 'Active Partner Showrooms'}</h2>
            </div>
            <span className="dealer-count-badge">
              {shown.length} {shown.length === 1 ? 'Showroom' : 'Showrooms'} Available
            </span>
          </div>

          {/* Dealer Showroom Cards Grid */}
          {shown.length > 0 ? (
            <div className="dealer-cards-grid">
              {shown.map(vendor => (
                <article className="luxury-dealer-card" key={vendor.id}>
                  <div className="dealer-card-top">
                    <div className="dealer-logo-circle">
                      <Store size={22} />
                    </div>
                    <span className="verified-dealer-tag">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  </div>

                  <div className="dealer-card-body">
                    <h3 className="dealer-business-name">{vendor.businessName}</h3>
                    <p className="dealer-owner-name">Proprietor: {vendor.name}</p>
                    
                    <div className="dealer-city-tag">
                      <MapPin size={13} />
                      <span>{vendor.city} {vendor.area ? `· ${vendor.area}` : ''}</span>
                    </div>

                    <div className="dealer-stock-badge">
                      <CarFront size={13} />
                      <b>{vendor.listingCount}</b>
                      <span>{vendor.listingCount === 1 ? 'Car in Stock' : 'Cars in Stock'}</span>
                    </div>

                    {vendor.models && vendor.models.length > 0 && (
                      <div className="dealer-models-chips">
                        {vendor.models.slice(0, 4).map((m: string) => (
                          <span key={m} className="model-chip">{m}</span>
                        ))}
                        {vendor.models.length > 4 && (
                          <span className="model-chip more">+{vendor.models.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="dealer-card-foot">
                    <Link className="button button-primary button-full dealer-view-btn" href={`/dealers/${vendor.slug}`}>
                      <span>Visit Showroom &amp; Cars</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="dealer-empty-state-card">
              <div className="empty-state-icon-wrap">
                <Store size={36} />
              </div>
              <h3>{vendors.length ? 'No Showrooms Match Your Criteria' : 'No Partner Showrooms Registered Yet'}</h3>
              <p>{vendors.length ? 'Try clearing your filters or selecting a different city.' : 'Accredited dealer listings will populate automatically upon verification.'}</p>
              <div className="empty-actions-row">
                <Link className="button button-orange" href="/dealers">
                  View All Showrooms
                </Link>
                <Link className="button button-outline" href="/buy-cars">
                  Browse All Cars <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <MobileBottomNav />
      <SiteFooter />
    </>
  );
}
