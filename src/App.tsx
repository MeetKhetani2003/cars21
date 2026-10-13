'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, MapPin, ChevronDown, Phone, ArrowRight, CarFront, UserRound, X, Home, Search, HandCoins, FileCheck2, CircleUserRound } from 'lucide-react';
import { Link } from './lib/navigation';
import { ManagementPanel } from './experiences/management';
import { HomePage, InventoryPage, CarPage, SellPage, VehicleDetailsPage, ValuationPage, InspectionBookingPage, InspectionStatusPage, OfferPage, AuctionResultPage, InspectionPage, VehicleHistoryPage, LoansPage, EmiPage, EligibilityPage, DealerPage, AuctionPage, LoginPage, HelpPage, AccountPage, InspectorPage, OperationsPage, NotFoundPage } from './experiences';

export function SiteHeader(){
  const [open,setOpen]=useState(false);
  const [city,setCity]=useState('Bengaluru');
  const close=()=>setOpen(false);
  return <>
    <div className="utility"><div className="container utility-inner"><span><MapPin size={13}/><select aria-label="Choose city" value={city} onChange={e=>setCity(e.target.value)}><option>Bengaluru</option><option>Mumbai</option><option>Delhi NCR</option><option>Hyderabad</option><option>Pune</option><option>Chennai</option></select><ChevronDown size={12}/></span><div className="utility-links"><Link href="/help">Help &amp; support</Link><Link href="/account">Track your booking</Link><a href="tel:18001212121"><Phone size={13}/> 1800 121 2121</a></div></div></div>
    <header className="site-header"><div className="container nav-wrap"><Link href="/" className="wordmark" aria-label="Cars21 home" onClick={close}><span className="logo-mark"><CarFront size={20}/></span><span>CARS<span>21</span></span></Link>
      <nav className={open?'main-nav open':'main-nav'} aria-label="Main navigation"><Link href="/buy-cars" onClick={close}>Buy cars</Link><Link href="/sell-car" onClick={close}>Sell your car</Link><Link href="/inspection" onClick={close}>Inspection</Link><Link href="/loans24" onClick={close}>Car finance</Link><Link href="/dealer-auctions" onClick={close}>Dealer portal</Link><Link href="/vehicle-history" onClick={close}>Vehicle history</Link><div className="mobile-nav-extra"><Link href="/help" onClick={close}>Help &amp; support</Link></div></nav>
      <div className="nav-actions"><Link href="/login" className="login-link"><UserRound size={17}/><span>Log in</span></Link><Link href="/sell-car" className="button button-dark button-small">Sell your car <ArrowRight size={15}/></Link></div><button onClick={()=>setOpen(!open)} className="mobile-menu" aria-label={open?'Close navigation':'Open navigation'}>{open?<X/>:<Menu/>}</button>
    </div></header>
  </>;
}

export function SiteFooter(){return <footer className="site-footer"><div className="container"><div className="footer-top"><div className="footer-brand"><Link href="/" className="wordmark"><span className="logo-mark"><CarFront size={20}/></span><span>CARS<span>21</span></span></Link><p>A better way to buy and sell your next car.</p><div className="footer-demo"><span className="status-dot"/> Demo experience · Sample data</div></div><div className="footer-col"><h4>Discover</h4><Link href="/buy-cars">Buy used cars</Link><Link href="/inspection">Car inspection</Link><Link href="/vehicle-history">Vehicle history</Link><Link href="/loans24">Car finance</Link></div><div className="footer-col"><h4>Sell with us</h4><Link href="/sell-car">Sell your car</Link><Link href="/sell-car/valuation">Check valuation</Link><Link href="/become-a-dealer">Dealer partners</Link><Link href="/dealer-auctions">Dealer auctions</Link></div><div className="footer-col"><h4>Company</h4><Link href="/help">Help centre</Link><Link href="/account">Track a booking</Link><Link href="/help">Terms &amp; privacy</Link><a href="mailto:hello@cars21.example">Contact us</a></div></div><div className="footer-bottom"><span>© 2026 Cars21 Mobility. All rights reserved.</span><span>Built for a more confident car journey.</span></div></div></footer>}

function MobileBottomNav(){
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
  useEffect(()=>{if(pathname==='/dashboard')router.replace('/account')},[pathname,router]);
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
  else if(pathname==='/login') page=<LoginPage/>;
  else if(pathname==='/help') page=<HelpPage/>;
  else if(pathname==='/account') page=<AccountPage/>;
  else if(pathname==='/inspector') page=<InspectorPage/>;
  else if(pathname==='/operations') page=<OperationsPage/>;
  else if(pathname==='/dashboard') page=null;
  else page=<NotFoundPage/>;
  return <><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader/><main id="main-content" tabIndex={-1}>{page}</main><MobileBottomNav/><SiteFooter/></>;
}

export default function App(){return <CurrentPage/>;}

