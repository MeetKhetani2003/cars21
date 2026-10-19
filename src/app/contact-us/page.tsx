import { ArrowRight, BadgeCheck, Clock3, Headphones, Mail, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../../App';
import { ContactForm } from '../../components/ContactForm';

export const metadata = {
  title: 'Contact Cars21 | Buyer, seller and dealer support',
  description: 'Contact the Cars21 team for help with a car, selling your vehicle, dealer onboarding, or a subscription.',
};

export default function ContactUsPage() {
  const email = process.env.CARS21_CONTACT_EMAIL?.trim() || '';
  const whatsappDigits = (process.env.WHATSAPP_ADMIN_NUMBER || '').replace(/\D/g, '');
  const whatsapp = whatsappDigits.length === 10 ? `91${whatsappDigits}` : whatsappDigits;

  return <>
    <SiteHeader />
    <main className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero-copy">
          <span className="contact-kicker"><span/> CARS21 CUSTOMER CARE</span>
          <h1>Let’s get you to the right person.</h1>
          <p>Tell us what you need help with. Our team can guide you through a car enquiry, selling your vehicle, or setting up a dealership.</p>
          <div className="contact-promise"><ShieldCheck size={16}/><span>Real help from the Cars21 team, with your request sent directly to us.</span></div>
        </div>
        <div className="contact-hero-card">
          <span className="contact-hero-icon"><Headphones size={23}/></span>
          <span className="eyebrow">HOW CAN WE HELP?</span>
          <b>One team for your next step.</b>
          <p>Share a few details and choose a direct contact channel. We’ll have the context we need to help.</p>
          <div className="contact-hero-meta"><span><Clock3 size={15}/> Support for buyers and sellers</span><span><MapPin size={15}/> Across India</span></div>
        </div>
      </section>

      <section className="contact-content" aria-label="Contact options and message form">
        <div className="contact-form-panel">
          <div className="contact-section-heading"><span className="eyebrow">SEND A MESSAGE</span><h2>What can we help you with?</h2><p>Fill in the form and we’ll prepare your message for our team.</p></div>
          <ContactForm email={email} whatsapp={whatsapp}/>
        </div>
        <aside className="contact-side-panel">
          <div className="contact-side-heading"><span className="eyebrow">DIRECT CONTACT</span><h2>Pick the easiest way to reach us.</h2></div>
          {whatsapp ? <a className="contact-channel contact-channel-whatsapp" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi Cars21, I need help with a car enquiry.')}`} target="_blank" rel="noreferrer"><span><MessageCircle size={18}/></span><div><b>WhatsApp support</b><small>Start a chat with the Cars21 team</small></div><ArrowRight size={16}/></a> : <div className="contact-channel contact-channel-muted"><span><MessageCircle size={18}/></span><div><b>WhatsApp support</b><small>WhatsApp support is not configured yet.</small></div></div>}
          {email ? <a className="contact-channel" href={`mailto:${email}`}><span><Mail size={18}/></span><div><b>Email our team</b><small>{email}</small></div><ArrowRight size={16}/></a> : <div className="contact-channel contact-channel-muted"><span><Mail size={18}/></span><div><b>Email our team</b><small>Email support is not configured yet.</small></div></div>}
          <div className="contact-dealer-card"><span className="contact-dealer-icon"><BadgeCheck size={18}/></span><div><b>Looking to list as a dealer?</b><p>See the plans, tools and listing limits available to Cars21 partners.</p><a href="/pricing">Explore dealer pricing <ArrowRight size={14}/></a></div></div>
          <div className="contact-reassurance"><ShieldCheck size={16}/><span>Your details are only used to respond to your request.</span></div>
        </aside>
      </section>
    </main>
    <SiteFooter />
  </>;
}
