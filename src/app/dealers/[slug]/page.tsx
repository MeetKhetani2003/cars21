import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, Clock3, Globe2, MapPin, Store, ShieldCheck, Sparkles, Phone, CheckCircle2 } from 'lucide-react';
import { getPublicVendorProfile } from '../../../server/public-vendors';
import { CarCard } from '../../../components/CarCard';
import { TrackVendorView } from '../../../components/TrackActivity';
import { RevealPhoneButton } from '../../../components/RevealPhoneButton';
import { Link } from '../../../lib/navigation';
import { SaveVendorButton } from '../../../components/SaveVendorButton';
import { MobileBottomNav, SiteFooter, SiteHeader } from '../../../App';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicVendorProfile(slug).catch(() => null);
  if (!profile) return { title: 'Dealer profile | Cars21', robots: { index: false, follow: false } };
  const { vendor, cars } = profile;
  const description = vendor.description || `${vendor.businessName} in ${vendor.city} has ${cars.length} current used-car ${cars.length === 1 ? 'listing' : 'listings'} on Cars21. Compare vehicle details and contact the dealer.`;
  return {
    title: `${vendor.businessName} in ${vendor.city} | Verified Cars21 Showroom`,
    description: description.slice(0, 160),
    alternates: { canonical: `/dealers/${vendor.slug}` },
    openGraph: { title: `${vendor.businessName} | Cars21 Showroom`, description, type: 'website', ...(vendor.coverImage ? { images: [vendor.coverImage] } : {}) },
    robots: { index: true, follow: true },
  };
}

export default async function DealerProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getPublicVendorProfile(slug).catch(() => null);
  if (!profile) notFound();
  const { vendor, cars } = profile;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'AutoDealer', name: vendor.businessName,
    ...(siteUrl ? { url: `${siteUrl}/dealers/${vendor.slug}` } : {}),
    ...(vendor.description ? { description: vendor.description } : {}),
    ...(vendor.website ? { sameAs: [vendor.website] } : {}),
    ...(vendor.logo ? { image: vendor.logo } : {}),
    address: { '@type': 'PostalAddress', ...(vendor.address ? { streetAddress: vendor.address } : {}), addressLocality: vendor.area || vendor.city, addressRegion: vendor.city, addressCountry: 'IN' },
  };
  const jsonLd = JSON.stringify(structuredData).replace(/</g, '\\u003c');

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="dealer-profile-page">
        <TrackVendorView vendorSlug={vendor.slug} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

        {/* Top Breadcrumb */}
        <div className="container dealer-profile-breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/dealers">Dealers</Link>
          <span>/</span>
          <span className="active-crumb">{vendor.businessName}</span>
        </div>

        {/* Hero Cover Card */}
        <section 
          className="container dealer-profile-hero" 
          style={vendor.coverImage ? { backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.78) 100%), url("${vendor.coverImage}")` } : undefined}
        >
          <div className="dealer-hero-content-wrap">
            <div className="dealer-profile-identity">
              <div className="dealer-profile-mark">
                {vendor.logo ? (
                  <img src={vendor.logo} alt={`${vendor.businessName} logo`} />
                ) : (
                  <Store size={34} />
                )}
              </div>
              <div className="dealer-profile-heading">
                <span className="dealer-profile-kicker">
                  <ShieldCheck size={14} /> CARS21 ACCREDITED SHOWROOM
                </span>
                <h1 className="dealer-title-main">{vendor.businessName}</h1>
                <p className="dealer-desc-sub">
                  {vendor.description || `${vendor.name} · Certified Pre-Owned Dealership & Diagnostic Exchange`}
                </p>
                <div className="dealer-location-badge">
                  <MapPin size={14} />
                  <span>{[vendor.area, vendor.city].filter(Boolean).join(', ') || 'India'}</span>
                </div>
              </div>
            </div>

            <div className="dealer-profile-actions">
              <div className="dealer-stock-counter-card">
                <b>{cars.length}</b>
                <small>available {cars.length === 1 ? 'vehicle' : 'vehicles'}</small>
              </div>
              <div className="dealer-btns-row">
                <SaveVendorButton vendorId={vendor.id} vendorSlug={vendor.slug} />
                <RevealPhoneButton vendorSlug={vendor.slug} label="Contact Showroom" />
              </div>
            </div>
          </div>
        </section>

        {/* About & Business Details Bento */}
        {(vendor.description || vendor.address || vendor.website || vendor.workingHours || vendor.establishedYear || vendor.specialties.length > 0) && (
          <section className="container dealer-business-card">
            <div className="dealer-business-about">
              <span className="eyebrow">SHOWROOM HIGHLIGHTS</span>
              <h2>About {vendor.businessName}</h2>
              <p>
                {vendor.description || 'Welcome to our showroom. We offer thoroughly inspected pre-owned cars with transparent documentation and immediate handover assistance.'}
              </p>
              {vendor.specialties.length > 0 && (
                <div className="dealer-specialties-wrap">
                  {vendor.specialties.map(specialty => (
                    <span key={specialty} className="dealer-spec-pill">
                      <CheckCircle2 size={13} /> {specialty}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="dealer-business-details">
              {(vendor.address || vendor.area || vendor.city) && (
                <div className="detail-item-box">
                  <div className="item-icon"><MapPin size={18} /></div>
                  <div>
                    <b>Showroom Address</b>
                    <small>{[vendor.address, vendor.area, vendor.city].filter(Boolean).join(', ')}</small>
                  </div>
                </div>
              )}
              {vendor.workingHours && (
                <div className="detail-item-box">
                  <div className="item-icon"><Clock3 size={18} /></div>
                  <div>
                    <b>Operating Hours</b>
                    <small>{vendor.workingHours}</small>
                  </div>
                </div>
              )}
              {vendor.establishedYear && (
                <div className="detail-item-box">
                  <div className="item-icon"><BadgeCheck size={18} /></div>
                  <div>
                    <b>Serving Buyers Since</b>
                    <small>{vendor.establishedYear} ({new Date().getFullYear() - vendor.establishedYear}+ Years of Trust)</small>
                  </div>
                </div>
              )}
              {vendor.website && (
                <div className="detail-item-box">
                  <div className="item-icon"><Globe2 size={18} /></div>
                  <div>
                    <b>Official Website</b>
                    <a href={vendor.website} target="_blank" rel="noreferrer" className="website-link">
                      Visit Showroom Site <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Showroom Photo Gallery */}
        {vendor.shopPhotos.length > 0 && (
          <section className="container dealer-shop-gallery">
            <div className="dealer-profile-section-heading">
              <div>
                <span className="eyebrow">FACILITY &amp; PREMISES</span>
                <h2>Inside the Showroom</h2>
                <p>High-resolution photos shared directly by {vendor.businessName}.</p>
              </div>
            </div>
            <div className="dealer-shop-photo-grid">
              {vendor.shopPhotos.slice(0, 8).map((photo, index) => (
                <div key={`${photo}-${index}`} className="gallery-photo-card">
                  <img src={photo} alt={`${vendor.businessName} dealership facility ${index + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Live Dealer Inventory */}
        <section className="container dealer-profile-inventory">
          <div className="dealer-profile-section-heading">
            <div>
              <span className="eyebrow">CURRENT SHOWROOM STOCK</span>
              <h2>Available Cars ({cars.length})</h2>
              <p>Compare verified price, mileage, inspection score, and fuel type for vehicles on the showroom floor.</p>
            </div>
            <Link href="/buy-cars" className="button button-outline button-small">
              <ArrowLeft size={14} /> All Marketplace Cars
            </Link>
          </div>

          {cars.length > 0 ? (
            <div className="car-grid">
              {cars.map(car => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          ) : (
            <div className="dealer-profile-empty">
              <div className="empty-icon-box"><Store size={30} /></div>
              <h3>No Active Vehicles Listed</h3>
              <p>All vehicles at this showroom have recently been reserved or sold. Please check back soon or browse verified cars from other partner dealers.</p>
              <Link className="button button-orange" href="/buy-cars">
                Browse Marketplace <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </main>
      <MobileBottomNav />
      <SiteFooter />
    </>
  );
}
