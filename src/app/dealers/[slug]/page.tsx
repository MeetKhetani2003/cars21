import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, Clock3, Globe2, MapPin, Store } from 'lucide-react';
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
    title: `${vendor.businessName} in ${vendor.city} | Cars21 dealer`,
    description: description.slice(0, 160),
    alternates: { canonical: `/dealers/${vendor.slug}` },
    openGraph: { title: `${vendor.businessName} | Cars21`, description, type: 'website', ...(vendor.coverImage ? { images: [vendor.coverImage] } : {}) },
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

  return <><SiteHeader/><main id="main-content" className="dealer-profile-page">
    <TrackVendorView vendorSlug={vendor.slug}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }}/>
    <div className="container dealer-profile-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/dealers">Dealers</Link><span>/</span><span>{vendor.businessName}</span></div>
    <section className="container dealer-profile-hero" style={vendor.coverImage ? { backgroundImage: `linear-gradient(90deg,rgba(7,19,32,.94),rgba(7,19,32,.78)),url("${vendor.coverImage}")` } : undefined}>
      <div className="dealer-profile-identity">
        <div className="dealer-profile-mark">{vendor.logo ? <img src={vendor.logo} alt={`${vendor.businessName} logo`}/> : <Store size={27}/>}</div>
        <div className="dealer-profile-heading"><span className="dealer-profile-kicker"><BadgeCheck size={14}/> CARS21 BUSINESS PROFILE</span><h1>{vendor.businessName}</h1><p>{vendor.description || `${vendor.name} · Cars21 verified vehicle listings`}</p><span className="dealer-location"><MapPin size={15}/>{[vendor.area, vendor.city].filter(Boolean).join(', ') || 'India'}</span></div>
      </div>
      <div className="dealer-profile-actions"><span className="dealer-stock-count"><b>{cars.length}</b><small>available {cars.length === 1 ? 'car' : 'cars'}</small></span><SaveVendorButton vendorId={vendor.id} vendorSlug={vendor.slug}/><RevealPhoneButton vendorSlug={vendor.slug} label="Show dealer number"/></div>
    </section>
    {(vendor.description || vendor.address || vendor.website || vendor.workingHours || vendor.establishedYear || vendor.specialties.length > 0) && <section className="container dealer-business-card">
      <div className="dealer-business-about"><span className="eyebrow">ABOUT THE DEALERSHIP</span><h2>A little more about {vendor.businessName}</h2><p>{vendor.description || 'Explore this dealer’s current Cars21 inventory and contact the team about a vehicle.'}</p>{vendor.specialties.length > 0 && <div className="dealer-specialties">{vendor.specialties.map(specialty=><span key={specialty}>{specialty}</span>)}</div>}</div>
      <div className="dealer-business-details">
        {(vendor.address || vendor.area || vendor.city) && <div><MapPin size={17}/><span><b>Visit us</b><small>{[vendor.address, vendor.area, vendor.city].filter(Boolean).join(', ')}</small></span></div>}
        {vendor.workingHours && <div><Clock3 size={17}/><span><b>Business hours</b><small>{vendor.workingHours}</small></span></div>}
        {vendor.establishedYear && <div><BadgeCheck size={17}/><span><b>Serving drivers since</b><small>{vendor.establishedYear}</small></span></div>}
        {vendor.website && <div><Globe2 size={17}/><span><b>Website</b><a href={vendor.website} target="_blank" rel="noreferrer">Visit dealership website</a></span></div>}
      </div>
    </section>}
    {vendor.shopPhotos.length > 0 && <section className="container dealer-shop-gallery"><div className="dealer-profile-section-heading"><div><span className="eyebrow">INSIDE THE DEALERSHIP</span><h2>Our showroom</h2><p>Photos shared by {vendor.businessName}.</p></div></div><div className="dealer-shop-photo-grid">{vendor.shopPhotos.slice(0, 8).map((photo, index)=><img key={`${photo}-${index}`} src={photo} alt={`${vendor.businessName} dealership photo ${index + 1}`} loading="lazy"/>)}</div></section>}
    <section className="container dealer-profile-inventory">
      <div className="dealer-profile-section-heading"><div><span className="eyebrow">CURRENT INVENTORY</span><h2>Cars listed by {vendor.businessName}</h2><p>Compare price, model, mileage and location across this dealer’s active listings.</p></div><Link href="/buy-cars" className="text-link"><ArrowLeft size={15}/> All cars</Link></div>
      {cars.length ? <div className="car-grid">{cars.map(car => <CarCard key={car.id} car={car}/>)}</div> : <div className="dealer-profile-empty"><Store size={24}/><h3>No active listings right now</h3><p>Check back later or browse cars from other dealers.</p><Link className="button button-dark" href="/buy-cars">Browse all cars <ArrowRight size={16}/></Link></div>}
    </section>
  </main><MobileBottomNav/><SiteFooter/></>;
}
