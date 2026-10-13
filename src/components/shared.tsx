import { Link } from '../lib/navigation';
import { ArrowRight, BadgeCheck, Banknote, FileCheck2, Heart, IndianRupee, MapPin, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
export const SectionTitle=({eyebrow,title,copy,link,linkText}:{eyebrow?:string;title:string;copy?:string;link?:string;linkText?:string})=><div className="section-title"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{copy&&<p>{copy}</p>}</div>{link&&<Link className="text-link" to={link}>{linkText||'Explore all'} <ArrowRight size={16}/></Link>}</div>;
export const PageHero=({eyebrow,title,copy}:{eyebrow:string;title:string;copy:string})=><section className="page-hero"><div className="container"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div></section>;
export const TrustStrip=()=> <div className="trust-strip"><div><ShieldCheck/><span><b>Verified details</b><small>Know what you’re buying</small></span></div><div><FileCheck2/><span><b>Clear documentation</b><small>Guidance at every step</small></span></div><div><Banknote/><span><b>Transparent pricing</b><small>No surprise add-ons</small></span></div><div><Sparkles/><span><b>Human support</b><small>Here when you need it</small></span></div></div>;
export const CheckBullet=({children}:{children:React.ReactNode})=><span className="check-bullet"><span>✓</span>{children}</span>;

