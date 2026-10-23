'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, MapPin, ChevronDown, Phone, ArrowRight, CarFront, UserRound, X, Home, Search, HandCoins, FileCheck2, CircleUserRound, Heart } from 'lucide-react';
import { Link } from './lib/navigation';
import { useBuyerExperience } from './components/BuyerExperienceProvider';
import { ManagementPanel } from './experiences/management';
import { HomePage, InventoryPage, CarPage, SellPage, VehicleDetailsPage, ValuationPage, InspectionBookingPage, InspectionStatusPage, OfferPage, AuctionResultPage, InspectionPage, VehicleHistoryPage, LoansPage, EmiPage, EligibilityPage, DealerPage, AuctionPage, HelpPage, AccountPage, InspectorPage, OperationsPage, NotFoundPage } from './experiences';

export function SiteHeader(){
  const [open,setOpen]=useState(false);
  const [city,setCity]=useState('Bengaluru');
  const {buyer,openLoginModal,wishlistIds}=useBuyerExperience();
  const close=()=>setOpen(false);
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/" className="wordmark" aria-label="Cars21 home" onClick={close}>
            <span className="logo-mark" style={{ background: '#0f172a', color: '#ff5c00', border: '1px solid rgba(255, 92, 0, 0.35)' }}>
              <CarFront size={20}/>
            </span>
            <span className="wordmark-text" style={{ color: '#0f172a', fontWeight: 900 }}>
              CARS<span className="logo-accent" style={{ color: '#ff5c00', fontWeight: 900 }}>21</span>
            </span>
          </Link>
          <div className="nav-location-pill">
            <MapPin size={14}/>
            <select 
              aria-label="Choose city" 
              value={city} 
              onChange={e=>setCity(e.target.value)} 
              style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', color: '#1e293b' }}
            >
              <option>Bengaluru</option>
              <option>Mumbai</option>
              <option>Delhi NCR</option>
              <option>Hyderabad</option>
              <option>Pune</option>
              <option>Chennai</option>
            </select>
            <ChevronDown size={12}/>
          </div>
        </div>

        <nav className={open?'main-nav open':'main-nav'} aria-label="Main navigation">
          <Link href="/buy-cars" onClick={close} className="nav-item-link">Buy Cars</Link>
          <Link href="/sell-car/valuation" onClick={close} className="nav-item-link">Car Valuation</Link>
          <Link href="/loans24" onClick={close} className="nav-item-link">Car Loans</Link>
          <Link href="/dealers" onClick={close} className="nav-item-link">Dealers</Link>
          <Link href="/dealer-auctions" onClick={close} className="nav-item-link">Auctions</Link>
          <div className="mobile-nav-extra">
            <Link href="/sell-car" onClick={close}>Sell your car</Link>
            <Link href="/pricing" onClick={close}>Dealer plans</Link>
            <Link href="/about-us" onClick={close}>About us</Link>
            <Link href="/help" onClick={close}>Help &amp; support</Link>
            <Link href="/become-a-dealer" onClick={close}>Join dealer network</Link>
          </div>
        </nav>

        <div className="nav-actions">
          <Link href="/account" className="nav-wishlist-btn" aria-label="Saved vehicles">
            <Heart size={18}/>
            {wishlistIds?.length > 0 && <span className="nav-wishlist-counter">{wishlistIds.length}</span>}
          </Link>

          {buyer ? (
            <Link href="/account" className="login-link">
              <UserRound size={16}/>
              <span>{buyer.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <button type="button" onClick={()=>openLoginModal()} className="login-link">
              <UserRound size={16}/>
              <span>Log in</span>
            </button>
          )}

          <Link href="/sell-car" className="button button-orange button-small nav-sell-cta">
            Sell Car <ArrowRight size={14}/>
          </Link>
        </div>

        <button onClick={()=>setOpen(!open)} className="mobile-menu" aria-label={open?'Close navigation':'Open navigation'}>
          {open?<X/>:<Menu/>}
        </button>
      </div>
    </header>
  );
}

export function SiteFooter(){
  return <footer className="site-footer">
    <div className="container">
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="wordmark wordmark-footer">
            <span className="logo-mark" style={{ background: '#1e293b', color: '#ff5c00', border: '1px solid rgba(255, 92, 0, 0.45)' }}>
              <CarFront size={20}/>
            </span>
            <span className="wordmark-text" style={{ color: '#ffffff', fontWeight: 900 }}>
              CARS<span className="logo-accent" style={{ color: '#ff5c00', fontWeight: 900 }}>21</span>
            </span>
          </Link>
          <p>The enterprise car marketplace, digital inspection standard, and dealer exchange platform.</p>
          <div className="footer-demo">
            <span className="status-dot"/> Platform Operational · Real-time Market Data
          </div>
        </div>
        <div className="footer-col">
          <h4>Marketplace</h4>
          <Link href="/buy-cars">Browse used cars</Link>
          <Link href="/sell-car">Instant cash offer</Link>
          <Link href="/sell-car/valuation">AI Valuation engine</Link>
          <Link href="/inspection">140-point diagnostics</Link>
        </div>
        <div className="footer-col">
          <h4>Enterprise &amp; Dealers</h4>
          <Link href="/become-a-dealer">Dealer partner program</Link>
          <Link href="/dealer-auctions">Live wholesale auctions</Link>
          <Link href="/dealers">Dealer showroom directory</Link>
          <Link href="/pricing">Dealer subscription plans</Link>
          <Link href="/vendor">Dealer CRM login</Link>
        </div>
        <div className="footer-col">
          <h4>Platform &amp; Help</h4>
          <Link href="/loans24">Loans24 financing</Link>
          <Link href="/loans24/emi-calculator">EMI calculator</Link>
          <Link href="/about-us">About Cars21 Mobility</Link>
          <Link href="/help">Knowledge base &amp; FAQs</Link>
          <Link href="/contact-us">Contact 24/7 support</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Cars21 Mobility Technologies Pvt. Ltd. All rights reserved.</span>
        <span>Standardized AI vehicle diagnostics &amp; verified automotive marketplace.</span>
      </div>
    </div>
  </footer>;
}

export function MobileBottomNav(){
  const pathname=usePathname();
  const items=[
    {to:'/',label:'Home',Icon:Home},
    {to:'/buy-cars',label:'Search',Icon:Search},
    {to:'/sell-car',label:'Sell',Icon:HandCoins},
    {to:'/inspection',label:'Inspect',Icon:FileCheck2},
    {to:'/account',label:'Account',Icon:CircleUserRound},
  ];
  return <nav className="mobile-bottom-nav" aria-label="Quick navigation">{items.map(({to,label,Icon})=>{
    const active=to==='/'?pathname==='/':pathname===to||pathname.startsWith(`${to}/`)||(to==='/buy-cars'&&pathname.startsWith('/car/'));
    return <Link key={to} to={to} className={active?'active':''} aria-current={active?'page':undefined}><Icon size={19} strokeWidth={active?2.4:1.8}/><span>{label}</span></Link>;
  })}</nav>;
}

function CurrentPage(){
  const pathname=usePathname();
  const router=useRouter();
  const {openLoginModal}=useBuyerExperience();
  useEffect(()=>{if(pathname==='/dashboard')router.replace('/account')},[pathname,router]);
  useEffect(()=>{if(pathname==='/login'){const params=new URLSearchParams(window.location.search);openLoginModal(params.get('returnTo')||'/')}},[pathname,openLoginModal]);
  if(pathname==='/superadmin'||pathname.startsWith('/superadmin/')) return <ManagementPanel role="superadmin"/>;
  if(pathname==='/admin'||pathname.startsWith('/admin/')||pathname==='/operations') return <ManagementPanel role="admin"/>;
  if(pathname==='/vendor'||pathname.startsWith('/vendor/')) return <ManagementPanel role="vendor"/>;
  let page;
  if(pathname==='/') page=<HomePage/>;
  else if(pathname==='/buy-cars'||pathname.startsWith('/buy-cars/')) page=<InventoryPage/>;
  else if(pathname.startsWith('/car/')) page=<CarPage/>;
  else if(pathname==='/sell-car') page=<SellPage/>;
  else if(pathname==='/sell-car/vehicle-details') page=<VehicleDetailsPage/>;
  else if(pathname==='/sell-car/valuation') page=<ValuationPage/>;
  else if(pathname==='/sell-car/inspection') page=<InspectionBookingPage/>;
  else if(pathname==='/sell-car/inspection-status') page=<InspectionStatusPage/>;
  else if(pathname==='/sell-car/offer') page=<OfferPage/>;
  else if(pathname==='/sell-car/auction-result') page=<AuctionResultPage/>;
  else if(pathname==='/inspection') page=<InspectionPage/>;
  else if(pathname==='/vehicle-history') page=<VehicleHistoryPage/>;
  else if(pathname==='/loans24') page=<LoansPage/>;
  else if(pathname==='/loans24/emi-calculator') page=<EmiPage/>;
  else if(pathname==='/loans24/eligibility') page=<EligibilityPage/>;
  else if(pathname==='/become-a-dealer') page=<DealerPage/>;
  else if(pathname==='/dealer-auctions') page=<AuctionPage/>;
  else if(pathname==='/login') page=<HomePage/>;
  else if(pathname==='/help') page=<HelpPage/>;
  else if(pathname==='/account') page=<AccountPage/>;
  else if(pathname==='/inspector') page=<InspectorPage/>;
  else if(pathname==='/operations') page=<OperationsPage/>;
  else if(pathname==='/dashboard') page=null;
  else page=<NotFoundPage/>;
  return <><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader/><main id="main-content" tabIndex={-1}>{page}</main><MobileBottomNav/><SiteFooter/></>;
}

export default function App(){return <CurrentPage/>;}

