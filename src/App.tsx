'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, MapPin, ChevronDown, Phone, ArrowRight, CarFront, UserRound, X, 
  Home, Search, HandCoins, FileCheck2, CircleUserRound, Heart,
  Calculator, Building2, Gavel, Sparkles, HelpCircle, Info, ChevronRight,
  ShieldCheck, History, Landmark, Briefcase, Car
} from 'lucide-react';
import { Link } from './lib/navigation';
import { useBuyerExperience } from './components/BuyerExperienceProvider';
import { ManagementPanel } from './experiences/management';
import { HomePage, InventoryPage, CarPage, SellPage, VehicleDetailsPage, ValuationPage, InspectionBookingPage, InspectionStatusPage, OfferPage, AuctionResultPage, InspectionPage, VehicleHistoryPage, LoansPage, EmiPage, EligibilityPage, DealerPage, AuctionPage, HelpPage, AccountPage, InspectorPage, OperationsPage, NotFoundPage } from './experiences';

export function SiteHeader(){
  const [open,setOpen]=useState(false);
  const [city,setCity]=useState('Bengaluru');
  const {buyer,openLoginModal,wishlistIds}=useBuyerExperience();
  const close=()=>setOpen(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <div className="nav-brand-group">
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

          <nav className="main-nav desktop-only-nav" aria-label="Main navigation">
            <Link href="/buy-cars" className="nav-item-link">Buy Cars</Link>
            <Link href="/sell-car/valuation" className="nav-item-link">Car Valuation</Link>
            <Link href="/loans24" className="nav-item-link">Car Loans</Link>
            <Link href="/dealers" className="nav-item-link">Dealers</Link>
            <Link href="/dealer-auctions" className="nav-item-link">Auctions</Link>
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
            {open?<X size={20}/>:<Menu size={20}/>}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (placed outside header so it never gets clipped by header backdrop-filter/height) */}
      {open && (
        <div className="mobile-drawer-portal">
          <div className="nav-backdrop" onClick={close} aria-hidden="true" />
          <aside className="mobile-drawer-panel" aria-label="Mobile site navigation">
            <div className="mobile-drawer-top">
              {buyer ? (
                <Link href="/account" onClick={close} className="mobile-user-card">
                  <div className="mobile-user-avatar">
                    <UserRound size={20}/>
                  </div>
                  <div className="mobile-user-info">
                    <strong>{buyer.name}</strong>
                    <span>{buyer.phone || 'Verified Account'} · View Profile</span>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
              ) : (
                <div className="mobile-drawer-auth-row">
                  <button type="button" onClick={()=>{close();openLoginModal();}} className="button button-primary button-small" style={{ flex: 1 }}>
                    <UserRound size={14}/> Sign In / Register
                  </button>
                  <Link href="/sell-car" onClick={close} className="button button-orange button-small" style={{ flex: 1 }}>
                    Sell Car <ArrowRight size={14}/>
                  </Link>
                </div>
              )}
            </div>

            <div className="mobile-drawer-sections">
              {/* SECTION: BUY & EXPLORE */}
              <div className="mobile-nav-group">
                <span className="mobile-group-title">BUY &amp; EXPLORE</span>
                <Link href="/buy-cars" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Car size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Buy Verified Cars</strong>
                    <small>2,450+ inspected cars with 7-day money back</small>
                  </div>
                  <span className="mobile-badge-blue">2.4k+</span>
                </Link>
                <Link href="/inspection" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#ecfdf5', color: '#059669' }}><ShieldCheck size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>140-Point Diagnostics</strong>
                    <small>Cloud report, scanner test &amp; battery health</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
                <Link href="/vehicle-history" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><History size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Vehicle History Check</strong>
                    <small>RTO records, challans &amp; accident history</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
              </div>

              {/* SECTION: SELL YOUR CAR */}
              <div className="mobile-nav-group">
                <span className="mobile-group-title">SELL YOUR CAR</span>
                <Link href="/sell-car" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><HandCoins size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Instant Cash Offer</strong>
                    <small>Doorstep inspection &amp; 30-min instant payout</small>
                  </div>
                  <span className="mobile-badge-orange">INSTANT</span>
                </Link>
                <Link href="/sell-car/valuation" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Sparkles size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>AI Valuation Engine</strong>
                    <small>Market price calculation in under 10 seconds</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
              </div>

              {/* SECTION: FINANCING & LOANS24 */}
              <div className="mobile-nav-group">
                <span className="mobile-group-title">LOANS &amp; FINANCING</span>
                <Link href="/loans24" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Landmark size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Loans24 Auto Financing</strong>
                    <small>Low 8.99% interest rate &amp; zero down payment</small>
                  </div>
                  <span className="mobile-badge-green">8.99%</span>
                </Link>
                <Link href="/loans24/emi-calculator" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f8fafc', color: '#475569' }}><Calculator size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>EMI Calculator</strong>
                    <small>Plan monthly installments &amp; tenure</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
                <Link href="/loans24/eligibility" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f1f5f9', color: '#334155' }}><FileCheck2 size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Loan Eligibility Check</strong>
                    <small>Check pre-approved loan in 2 minutes</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
              </div>

              {/* SECTION: DEALERS & ENTERPRISE */}
              <div className="mobile-nav-group">
                <span className="mobile-group-title">DEALERS &amp; BUSINESS</span>
                <Link href="/dealers" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f8fafc', color: '#1e293b' }}><Building2 size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Dealer Showrooms Directory</strong>
                    <small>Verified dealerships across 12+ metro areas</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
                <Link href="/dealer-auctions" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Gavel size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Live Wholesale Auctions</strong>
                    <small>Exclusive B2B inventory for certified dealers</small>
                  </div>
                  <span className="mobile-badge-red">LIVE</span>
                </Link>
                <Link href="/become-a-dealer" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}><Briefcase size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Join Dealer Partner Network</strong>
                    <small>Get floor plan financing &amp; daily auction access</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
                <Link href="/vendor" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f8fafc', color: '#64748b' }}><Building2 size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Dealer CRM Portal</strong>
                    <small>Manage stock, inspect cars &amp; track bids</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
              </div>

              {/* SECTION: COMPANY & HELP */}
              <div className="mobile-nav-group">
                <span className="mobile-group-title">SUPPORT &amp; ABOUT</span>
                <Link href="/help" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f8fafc', color: '#475569' }}><HelpCircle size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>Help Center &amp; FAQs</strong>
                    <small>Buying, warranty, transfer &amp; payment FAQs</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
                <Link href="/about-us" onClick={close} className="mobile-menu-item">
                  <span className="mobile-menu-icon" style={{ background: '#f8fafc', color: '#475569' }}><Info size={18}/></span>
                  <div className="mobile-menu-text">
                    <strong>About Cars21 Mobility</strong>
                    <small>Our mission, diagnostics standard &amp; team</small>
                  </div>
                  <ChevronRight size={16} className="mobile-chevron-muted" />
                </Link>
              </div>
            </div>

            <div className="mobile-drawer-footer">
              <a href="tel:18002082121" className="mobile-drawer-phone">
                <Phone size={14}/> <span>24/7 Support: <b>1800-208-2121</b></span>
              </a>
              <p>© 2026 Cars21 Mobility Technologies Pvt. Ltd.</p>
            </div>
          </aside>
        </div>
      )}
    </>
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

