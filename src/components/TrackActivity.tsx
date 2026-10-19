'use client';

import { useEffect } from 'react';

export function TrackVendorView({ vendorSlug }: { vendorSlug: string }) {
  useEffect(() => {
    void fetch('/api/user/actions', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'vendor_view', vendorSlug }) }).catch(() => null);
  }, [vendorSlug]);
  return null;
}
