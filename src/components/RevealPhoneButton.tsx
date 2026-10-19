'use client';

import { useState } from 'react';
import { ChevronDown, Eye, Phone } from 'lucide-react';
import { useBuyerExperience } from './BuyerExperienceProvider';

export function RevealPhoneButton({ carId, vendorSlug, label = 'Show phone number' }: { carId?: string; vendorSlug?: string; label?: string }) {
  const { openLoginModal } = useBuyerExperience();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function reveal() {
    setOpen(value => !value);
    if (phone || loading || open) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/user/reveal-phone', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carId, vendorSlug }) });
      const result = await response.json();
      if (response.status === 401) {
        const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        setOpen(false); openLoginModal(returnTo);
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Number is unavailable.');
      setPhone(String(result.phone || ''));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Number is unavailable.'); }
    finally { setLoading(false); }
  }

  return <div className={`reveal-contact${open ? ' is-open' : ''}`}>
    <button type="button" aria-expanded={open} onClick={() => void reveal()}><Eye size={14}/>{loading ? 'Loading number…' : phone ? (open ? 'Hide number' : 'Show number') : open ? 'Hide number' : label}<ChevronDown size={14}/></button>
    {open && <div className="reveal-contact-content">{phone ? <a href={`tel:${phone}`}><Phone size={14}/>{phone}</a> : error ? <span role="status">{error}</span> : !loading ? <span>Checking dealer contact…</span> : null}</div>}
  </div>;
}
