'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, ChevronDown, Send } from 'lucide-react';

export function ContactForm({ email, whatsapp }: { email: string; whatsapp: string }) {
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') || '').trim();
    const senderEmail = String(values.get('email') || '').trim();
    const phone = String(values.get('phone') || '').trim();
    const topic = String(values.get('topic') || '').trim();
    const message = String(values.get('message') || '').trim();
    const text = [
      'Hi Cars21, I need help.', '', `Name: ${name}`, `Email: ${senderEmail}`,
      `Phone: ${phone || 'Not provided'}`, `Topic: ${topic}`, '', message,
    ].join('\n');

    if (whatsapp) {
      const popup = window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
      if (popup) popup.opener = null;
      else window.location.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
      setSent(true);
      return;
    }
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Cars21 support: ${topic}`)}&body=${encodeURIComponent(text)}`;
      setSent(true);
      return;
    }
    setError('Our contact channels are not configured yet. Please try again later.');
  }

  return <form className="contact-form" onSubmit={submit}>
    <div className="contact-fields-row">
      <label>Name<input name="name" autoComplete="name" required maxLength={100} placeholder="Your name"/></label>
      <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={160} placeholder="you@example.com"/></label>
    </div>
    <div className="contact-fields-row">
      <label>Phone number <span>Optional</span><input name="phone" type="tel" autoComplete="tel" maxLength={24} placeholder="+91 98765 43210"/></label>
      <label>What do you need help with?<span className="contact-select-wrap"><select name="topic" defaultValue="Buying a car"><option>Buying a car</option><option>Selling my car</option><option>Dealer onboarding</option><option>Subscription plans</option><option>Website or account support</option><option>Something else</option></select><ChevronDown size={15}/></span></label>
    </div>
    <label>Your message<textarea name="message" required minLength={10} maxLength={1200} rows={5} placeholder="Tell us a little about what you need…"/></label>
    {error && <p className="contact-form-error" role="alert">{error}</p>}
    {sent && <p className="contact-form-success" role="status"><Check size={15}/> Your message is ready in {whatsapp ? 'WhatsApp' : 'your email app'}. Send it there to reach our team.</p>}
    <div className="contact-form-footer"><span>We’ll only use these details to respond to your request.</span><button type="submit" className="contact-submit">Prepare message <Send size={15}/><ArrowUpRight size={14}/></button></div>
  </form>;
}
