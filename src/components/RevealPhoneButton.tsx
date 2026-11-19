'use client';

import { useState } from 'react';
import { ChevronDown, Eye, Phone } from 'lucide-react';
import { useBuyerExperience } from './BuyerExperienceProvider';

export function RevealPhoneButton({ carId, vendorSlug, label = 'Show phone number' }: { carId?: string; vendorSlug?: string; label?: string }) {
  const { buyer, isLeadCaptured, leadInfo, openBuyCarLeadModal, recordAction } = useBuyerExperience();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchPhoneNumber() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/user/reveal-phone', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          vendorSlug,
          leadPhone: leadInfo?.phone || buyer?.phone,
          leadName: leadInfo?.name || buyer?.name,
          leadCity: leadInfo?.city || buyer?.city,
        })
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 && result.lead_required) {
          openBuyCarLeadModal(() => { void fetchPhoneNumber(); });
          return;
        }
        throw new Error(result.error || 'Number is unavailable.');
      }
      setPhone(String(result.phone || ''));
      setOpen(true);
      void recordAction({
        action: 'button_click',
        buttonName: 'Revealed Dealer Contact',
        carId,
        vendorSlug,
        details: `Revealed contact for ${result.carLabel || result.vendorName || 'dealer'}`
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Number is unavailable.');
    } finally {
      setLoading(false);
    }
  }

  async function reveal() {
    if (phone) {
      setOpen(val => !val);
      return;
    }
    if (!isLeadCaptured && !buyer) {
      openBuyCarLeadModal(() => {
        void fetchPhoneNumber();
      });
      return;
    }
    await fetchPhoneNumber();
  }

  return (
    <div className={`reveal-contact${open ? ' is-open' : ''}`}>
      <button type="button" aria-expanded={open} onClick={() => void reveal()}>
        <Eye size={14}/>
        {loading ? 'Loading number…' : phone ? (open ? 'Hide number' : 'Show number') : open ? 'Hide number' : label}
        <ChevronDown size={14}/>
      </button>
      {open && (
        <div className="reveal-contact-content">
          {phone ? <a href={`tel:${phone}`}><Phone size={14}/>{phone}</a> : error ? <span role="status">{error}</span> : !loading ? <span>Checking dealer contact…</span> : null}
        </div>
      )}
    </div>
  );
}
