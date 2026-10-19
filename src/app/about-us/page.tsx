import { ArrowRight, BadgeCheck, CarFront, ClipboardCheck, Compass, HeartHandshake, MessageCircle, Search, ShieldCheck, Store, UsersRound } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../../App';
import { Link } from '../../lib/navigation';
import { getDb } from '../../server/mongodb';
import { getPublicVendorDirectory } from '../../server/public-vendors';

export const metadata = {
  title: 'About Cars21 | A clearer way to buy and sell cars',
  description: 'Learn how Cars21 brings car listings, local dealers, seller requests and buyer enquiries together in one marketplace.',
};

async function getMarketplaceStats() {
  try {
    const db = await getDb();
    const [listings, cities, dealers] = await Promise.all([
      db.collection('cars').countDocuments({ $or: [{ status: 'active' }, { status: { $exists: false } }] }),
      db.collection('cars').distinct('city', { $or: [{ status: 'active' }, { status: { $exists: false } }] }),
      getPublicVendorDirectory(),
    ]);
    return { listings, cities: cities.filter((city): city is string => typeof city === 'string' && city.trim().length > 0).length, dealers: dealers.length };
  } catch {
    return { listings: 0, cities: 0, dealers: 0 };
  }
}

function countLabel(value: number, singular: string, plural: string) {
  return value ? `${value.toLocaleString('en-IN')} ${value === 1 ? singular : plural}` : 'Explore Cars21';
}

export default async function AboutUsPage() {
  const stats = await getMarketplaceStats();
  return <>
    <SiteHeader />
    <main className="company-page about-page">
      <section className="about-hero">
        <div className="about-hero-copy"><span className="about-kicker"><span/> THE CARS21 MARKETPLACE</span><h1>A clearer way to find your next car.</h1><p>Cars21 brings used-car listings, local dealer profiles, seller requests and buyer enquiries together in one place—so the next step is easier to understand.</p><div className="about-hero-actions"><Link className="button button-primary" href="/buy-cars">Explore cars <ArrowRight size={16}/></Link><Link className="about-secondary-link" href="/dealers">Meet our dealers <ArrowRight size={15}/></Link></div></div>
        <div className="about-hero-art" aria-hidden="true"><div className="about-art-orbit about-art-orbit-one"/><div className="about-art-orbit about-art-orbit-two"/><div className="about-art-card about-art-car"><span><CarFront size={22}/></span><div><b>Find your next car</b><small>Compare listings by model, price and place</small></div><ArrowRight size={17}/></div><div className="about-art-card about-art-dealer"><span><Store size={20}/></span><div><b>Local dealer profiles</b><small>Business details and available cars</small></div><BadgeCheck size={17}/></div></div>
      </section>

      <section className="about-live-data" aria-label="Current Cars21 marketplace data"><div className="about-data-intro"><span className="eyebrow">THE MARKETPLACE TODAY</span><h2>Built around real listings.</h2><p>These figures come from Cars21’s currently published inventory and dealer pages.</p></div><div className="about-data-grid"><article><b>{countLabel(stats.listings,'live listing','live listings')}</b><span>Cars available to explore</span></article><article><b>{countLabel(stats.dealers,'dealer profile','dealer profiles')}</b><span>Local businesses with public inventory</span></article><article><b>{countLabel(stats.cities,'city','cities')}</b><span>Locations represented in current listings</span></article></div></section>

      <section className="about-section about-purpose"><div className="about-section-heading"><span className="eyebrow">WHAT WE DO</span><h2>Useful information at every step.</h2><p>Buying or selling a car involves choices, details and follow-up. Cars21 organizes those steps so people can compare options and contact the right seller.</p></div><div className="about-purpose-grid"><article><span><Search size={20}/></span><h3>Discover and compare</h3><p>Search by make, model, city, area and price. Review the vehicle’s details and open its listing before deciding whether to enquire.</p></article><article><span><UsersRound size={20}/></span><h3>Connect with sellers</h3><p>Browse dealer pages with business information and inventory, or send a question about a specific car through its listing.</p></article><article><span><ClipboardCheck size={20}/></span><h3>Keep the process visible</h3><p>Buyer enquiries are saved for follow-up. Dealer inspection information is reviewed by Cars21, with its review state shown on the listing.</p></article></div></section>

      <section className="about-journey"><div className="about-section-heading"><span className="eyebrow">HOW IT WORKS</span><h2>Three simple steps to move forward.</h2><p>Start with what you need today. You can explore the marketplace without making a commitment.</p></div><div className="about-steps"><article><span>01</span><div><h3>Choose a direction</h3><p>Browse available cars, look for a local dealer, or request help selling your vehicle.</p></div></article><article><span>02</span><div><h3>Review the details</h3><p>Check price, location, vehicle specifications and any inspection information shown with the listing.</p></div></article><article><span>03</span><div><h3>Send an enquiry</h3><p>Ask about the vehicle or arrange a conversation. The enquiry is saved so the seller and Cars21 team can follow up.</p></div></article></div></section>

      <section className="about-audience-grid"><article className="about-audience-card about-audience-buyer"><span className="about-audience-icon"><Compass size={19}/></span><span className="eyebrow">FOR CAR SHOPPERS</span><h2>Find a car that fits your plans.</h2><p>Search available listings, compare details, save cars you like and contact the seller when you’re ready.</p><Link href="/buy-cars">Search cars <ArrowRight size={15}/></Link></article><article className="about-audience-card"><span className="about-audience-icon"><HeartHandshake size={19}/></span><span className="eyebrow">FOR PRIVATE SELLERS</span><h2>Start with a sale request.</h2><p>Share your vehicle details with Cars21. Our team reviews the request before an eligible private listing is published.</p><Link href="/sell-car">Request to sell <ArrowRight size={15}/></Link></article><article className="about-audience-card"><span className="about-audience-icon"><Store size={19}/></span><span className="eyebrow">FOR DEALERS</span><h2>Manage your cars in one workspace.</h2><p>Dealer partners can maintain business details, manage inventory, submit inspection material and respond to buyer enquiries.</p><Link href="/pricing">See dealer plans <ArrowRight size={15}/></Link></article></section>

      <section className="about-principles"><div><span className="about-principle-icon"><ShieldCheck size={20}/></span><div><span className="eyebrow">OUR APPROACH</span><h2>Clear details. Thoughtful follow-up.</h2><p>Cars21 helps organize vehicle information and connect buyers with sellers. Buyers should review the listing, ask questions and verify vehicle details with the seller before purchase.</p></div></div><div className="about-principle-points"><span><BadgeCheck size={16}/> Seller and business details are shown where available</span><span><ClipboardCheck size={16}/> Dealer inspection packets have a visible review state</span><span><MessageCircle size={16}/> Enquiries are routed with the vehicle context</span></div></section>

      <section className="company-cta about-cta"><BadgeCheck size={22}/><div><b>Ready to take your next step?</b><span>Explore cars, find a dealer, or get in touch with the Cars21 team.</span></div><Link className="button button-dark" href="/contact-us">Contact Cars21 <ArrowRight size={15}/></Link></section>
    </main>
    <SiteFooter />
  </>;
}
