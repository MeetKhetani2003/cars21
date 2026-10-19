import { ArrowRight, BadgeCheck, CarFront, Check, CircleDollarSign, ImagePlus, MessageSquareText, Store } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../../App';
import { Link } from '../../lib/navigation';
import { getDb } from '../../server/mongodb';
import { defaultPlanFeatures } from '../../server/vendor-subscription';
import { formatINR } from '../../data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dealer pricing | Cars21', description: 'Compare Cars21 dealer subscription plans and marketplace tools.' };

type Plan = { id:string; name:string; description:string; price:number; durationDays:number; maxListings:number; maxImagesPerListing:number; features?:Record<string,boolean> };
const featureLabels:Record<string,string>={buyerInquiries:'Buyer enquiries',inspectionUploads:'Inspection uploads',listingAnalytics:'Listing analytics',publicBusinessProfile:'Public dealer page',priorityPlacement:'Priority listing placement'};

export default async function PricingPage(){
  let plans:Plan[]=[];
  try{plans=await(await getDb()).collection<Plan>('subscription_plans').find({active:true,public:true}).sort({price:1}).limit(30).toArray()}catch{}
  return <><SiteHeader/><main className="pricing-page"><section className="company-hero pricing-hero"><span className="eyebrow">CARS21 FOR DEALERS</span><h1>Choose the right space to grow your inventory.</h1><p>Each plan includes clear listing and photo limits, a subscription term, and the tools Cars21 enables for your dealership.</p><Link className="button button-primary" href="/contact-us">Talk to our team <ArrowRight size={16}/></Link></section><section className="container pricing-content"><div className="pricing-heading"><div><span className="eyebrow">DEALER SUBSCRIPTIONS</span><h2>Plans and included tools</h2></div><span>Plans shown here are managed by Cars21.</span></div>{plans.length?<div className="public-plan-grid">{plans.map(plan=>{const features={...defaultPlanFeatures,...plan.features};return <article className="public-plan-card" key={plan.id}><span className="management-icon blue"><CircleDollarSign size={19}/></span><h3>{plan.name}</h3><p>{plan.description||'A Cars21 dealer subscription.'}</p><div className="public-plan-price">{formatINR(plan.price)}<small>/{plan.durationDays} days</small></div><div className="public-plan-capacity"><span><CarFront size={15}/>{plan.maxListings} active listings</span><span><ImagePlus size={15}/>{plan.maxImagesPerListing} photos per listing</span></div><ul>{Object.entries(features).filter(([,enabled])=>enabled).map(([key])=><li key={key}><Check size={15}/>{featureLabels[key]||key}</li>)}</ul><Link className="button button-primary button-full" href="/contact-us">Request this plan <ArrowRight size={15}/></Link></article>})}</div>:<div className="pricing-empty"><Store size={24}/><h3>Dealer plans are being prepared</h3><p>Contact Cars21 to discuss onboarding and available marketplace plans.</p><Link className="button button-primary" href="/contact-us">Contact the team <ArrowRight size={15}/></Link></div>}<p className="pricing-note"><BadgeCheck size={15}/> Your dealer workspace shows the assigned plan, renewal date, listing capacity, and photo allowance.</p></section></main><SiteFooter/></>}
