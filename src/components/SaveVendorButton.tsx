'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useBuyerExperience } from './BuyerExperienceProvider';

export function SaveVendorButton({ vendorId, vendorSlug }: { vendorId: string; vendorSlug: string }) {
  const { buyer, loadingBuyer, savedVendorIds, toggleSavedVendor } = useBuyerExperience();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const saved = savedVendorIds.includes(vendorId);

  async function toggle() {
    setPending(true); setError('');
    const result = await toggleSavedVendor(vendorSlug);
    if (result === 'error') setError('Could not update your saved dealers. Please try again.');
    setPending(false);
  }

  return <div className="save-vendor-control">
    <button type="button" className={`save-vendor-button${saved ? ' is-saved' : ''}`} onClick={() => void toggle()} disabled={loadingBuyer || pending} aria-pressed={saved} aria-label={saved ? 'Remove dealer from saved dealers' : 'Save dealer'}>
      {saved ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>}<span>{pending ? 'Saving…' : saved ? 'Saved dealer' : 'Save dealer'}</span>
    </button>
    {error && <span className="save-vendor-error" role="alert">{error}</span>}
    {!buyer && <span className="save-vendor-hint">Sign in to keep this dealer</span>}
  </div>;
}
