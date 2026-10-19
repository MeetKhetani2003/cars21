'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRight, CarFront, ShieldCheck, X } from 'lucide-react';

const friendlyErrors: Record<string, string> = {
  not_configured: 'Google sign-in is not configured yet.', account_conflict: 'That email is linked to a different sign-in. Contact Cars21 support.',
  unverified_email: 'Google could not verify this email address. Try a verified Google account.', oauth_failed: 'Google sign-in could not be completed. Please try again.',
  oauth_unavailable: 'Account services are temporarily unavailable. Please try again.',
};

export function LoginModal({ open, returnTo, onClose }: { open: boolean; returnTo: string; onClose: () => void }) {
  const [consent, setConsent] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLElement>(null); const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; closeRef.current?.focus();
    const keyHandler = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab' && dialogRef.current) { const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')]; if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
    };
    window.addEventListener('keydown', keyHandler); return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', keyHandler); previous?.focus(); };
  }, [open, onClose]);
  useEffect(() => { if (!open || typeof window === 'undefined') return; setConsent(false); setLoading(false); setError(friendlyErrors[new URLSearchParams(window.location.search).get('error') || ''] || ''); }, [open]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    try { const response = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ consent: true, returnTo }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Google sign-in is unavailable.'); window.location.assign(result.url); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Google sign-in is unavailable.'); setLoading(false); }
  }
  function stopEscape(event: KeyboardEvent<HTMLElement>) { if (event.key === 'Escape') event.stopPropagation(); }
  if (!open) return null;
  return <div className="buyer-login-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="buyer-login-modal" role="dialog" aria-modal="true" aria-labelledby="buyer-login-title" aria-describedby="buyer-login-description" onKeyDown={stopEscape}>
    <button ref={closeRef} type="button" className="buyer-login-close" aria-label="Close sign in" onClick={onClose}><X size={19}/></button><span className="buyer-login-mark"><CarFront size={23}/></span><span className="eyebrow">YOUR CARS21 ACCOUNT</span><h2 id="buyer-login-title">Sign in to continue</h2><p id="buyer-login-description" className="buyer-login-copy">Save cars, contact sellers, and pick up your car search on any device.</p>
    <form onSubmit={signIn}><label className="login-tracking-consent"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)}/><span>I understand Cars21 records my searches, car and dealer views, enquiries, and revealed contact numbers. Recent activity appears in administration after seven days.</span></label>{error && <p className="management-error" role="alert">{error}</p>}<button className="button button-primary button-full google-signin-button" disabled={loading || !consent}><span className="google-g-mark" aria-hidden="true">G</span>{loading ? 'Connecting to Google…' : 'Continue with Google'}{!loading && <ArrowRight size={16}/>}</button></form>
    <p className="login-privacy-note"><ShieldCheck size={15}/> Your Google password is never shared with Cars21. Activity history is visible to Cars21 administrators.</p>
  </section></div>;
}
