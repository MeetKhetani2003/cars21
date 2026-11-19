'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Car } from '../data';
import { LoginModal } from './LoginModal';
import { BuyCarLeadModal } from './BuyCarLeadModal';

export type BuyerProfile = { name: string; email: string; picture?: string; phone?: string; city?: string };
export type SavedVendor = { id: string; slug: string; name: string; businessName: string; city: string; listingCount: number };
export type LeadInfo = { name: string; phone: string; city: string };
export type UserActionPayload = {
  action: 'search' | 'car_view' | 'vendor_view' | 'emi_calculate' | 'test_drive' | 'express_interest' | 'button_click' | 'inspection_view' | 'report_download' | 'contact_dealer' | 'reveal_phone' | 'buy_lead_captured' | 'wishlist_add' | 'wishlist_remove';
  buttonName?: string;
  carId?: string;
  vendorSlug?: string;
  details?: string;
  label?: string;
  targetType?: string;
  carPrice?: number;
  downPayment?: number;
  loanAmount?: number;
  tenureMonths?: number;
  interestRate?: number;
  monthlyEmi?: number;
  preferredDate?: string;
  preferredSlot?: string;
  locationType?: 'doorstep' | 'hub';
  interestType?: 'offer' | 'reserve' | 'callback' | 'inspection' | 'general';
  offerAmount?: number;
  phone?: string;
  notes?: string;
  channel?: 'whatsapp' | 'call';
};

type WishlistResult = 'saved' | 'removed' | 'login' | 'error';
type BuyerExperience = {
  buyer: BuyerProfile | null;
  wishlistIds: string[];
  wishlistCars: Car[];
  savedVendorIds: string[];
  savedVendors: SavedVendor[];
  loadingBuyer: boolean;
  openLoginModal: (returnTo?: string) => void;
  closeLoginModal: () => void;
  toggleWishlist: (carId: string) => Promise<WishlistResult>;
  toggleSavedVendor: (slug: string) => Promise<WishlistResult>;
  refreshBuyer: () => Promise<void>;
  signOut: () => Promise<void>;
  // Lead Collection state & actions
  isLeadCaptured: boolean;
  leadInfo: LeadInfo | null;
  openBuyCarLeadModal: (onSuccessAction?: (lead?: LeadInfo) => void) => void;
  closeBuyCarLeadModal: () => void;
  saveLeadInfo: (info: LeadInfo) => void;
  recordAction: (payload: UserActionPayload) => Promise<boolean>;
};
const Context = createContext<BuyerExperience | null>(null);
function currentPath() { return typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}${window.location.hash}`; }

export function BuyerExperienceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null); const [wishlistIds, setWishlistIds] = useState<string[]>([]); const [wishlistCars, setWishlistCars] = useState<Car[]>([]); const [loadingBuyer, setLoadingBuyer] = useState(true);
  const [savedVendorIds, setSavedVendorIds] = useState<string[]>([]); const [savedVendors, setSavedVendors] = useState<SavedVendor[]>([]);
  const [loginOpen, setLoginOpen] = useState(false); const [returnTo, setReturnTo] = useState('/');

  // Lead Collection State
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadOnSuccess, setLeadOnSuccess] = useState<((lead?: LeadInfo) => void) | null>(null);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const leadInfoRef = useRef<LeadInfo | null>(null);
  const visitorIdRef = useRef<string>('');

  // Hydrate lead capture state and persistent visitorId from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cars21_lead_info') || sessionStorage.getItem('cars21:lead_info');
      if (stored) {
        const parsed = JSON.parse(stored);
        setLeadInfo(parsed);
        leadInfoRef.current = parsed;
      }
      let vid = localStorage.getItem('cars21_visitor_id') || sessionStorage.getItem('cars21_visitor_id');
      if (!vid) {
        vid = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        localStorage.setItem('cars21_visitor_id', vid);
        sessionStorage.setItem('cars21_visitor_id', vid);
      }
      visitorIdRef.current = vid;
    } catch {}
  }, []);

  useEffect(() => {
    leadInfoRef.current = leadInfo;
  }, [leadInfo]);

  const isLeadCaptured = Boolean(buyer || leadInfo);

  // Auto-trigger lead capture modal on website entrance if not captured yet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loadingBuyer) return;
    if (buyer || isLeadCaptured) return;

    const path = window.location.pathname;
    if (
      path.startsWith('/admin') ||
      path.startsWith('/superadmin') ||
      path.startsWith('/manager') ||
      path.startsWith('/vendor') ||
      path.startsWith('/inspector') ||
      path.startsWith('/operations') ||
      path === '/login'
    ) {
      return;
    }

    try {
      const captured = localStorage.getItem('cars21_lead_captured') || sessionStorage.getItem('cars21_lead_captured');
      if (captured === 'true') return;

      const dismissed = sessionStorage.getItem('cars21_lead_dismissed');
      if (dismissed === 'true') return;
    } catch {}

    const timer = window.setTimeout(() => {
      setLeadModalOpen(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [buyer, isLeadCaptured, loadingBuyer]);

  const recordAction = useCallback(async (payload: UserActionPayload): Promise<boolean> => {
    try {
      const currentLead = leadInfoRef.current;
      const cleanPhone = (currentLead?.phone || buyer?.phone || '').replace(/\D/g, '');
      const leadUserId = cleanPhone ? `lead_${cleanPhone}` : (visitorIdRef.current || undefined);
      const leadName = currentLead?.name || (buyer?.name ? buyer.name : undefined);
      const leadPhone = currentLead?.phone || buyer?.phone || undefined;
      const leadCity = currentLead?.city || buyer?.city || undefined;

      const body = {
        ...payload,
        leadUserId,
        leadName,
        leadPhone,
        leadCity,
        visitorId: visitorIdRef.current,
      };

      const res = await fetch('/api/user/actions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [buyer]);

  const openBuyCarLeadModal = useCallback((onSuccessAction?: (lead?: LeadInfo) => void) => {
    setLeadOnSuccess(() => onSuccessAction || null);
    setLeadModalOpen(true);
  }, []);

  const closeBuyCarLeadModal = useCallback(() => {
    setLeadModalOpen(false);
    setLeadOnSuccess(null);
    try {
      sessionStorage.setItem('cars21_lead_dismissed', 'true');
    } catch {}
  }, []);

  const saveLeadInfo = useCallback((info: LeadInfo) => {
    setLeadInfo(info);
    leadInfoRef.current = info;
    try {
      localStorage.setItem('cars21_lead_captured', 'true');
      localStorage.setItem('cars21_lead_info', JSON.stringify(info));
      sessionStorage.setItem('cars21_lead_captured', 'true');
      sessionStorage.setItem('cars21:lead_info', JSON.stringify(info));
    } catch {}

    // Record telemetry event in database
    void recordAction({
      action: 'buy_lead_captured',
      phone: info.phone,
      details: `Lead Form Submitted: ${info.name} from ${info.city} (${info.phone})`
    });
  }, [recordAction]);
  const refreshBuyer = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json();
      const profile = result.user ? {
        name: String(result.user.name || 'Cars21 Member'),
        email: String(result.user.email || ''),
        picture: result.user.picture,
        phone: result.user.phone || '',
        city: result.user.city || ''
      } as BuyerProfile : null;
      setBuyer(profile);
      if (profile) {
        try {
          const pendingCar = sessionStorage.getItem('cars21:pending-wishlist');
          if (pendingCar) {
            const pendingResponse = await fetch('/api/user/wishlist', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carId: pendingCar, saved: true }) });
            if (pendingResponse.ok) sessionStorage.removeItem('cars21:pending-wishlist');
          }
          const pendingVendor = sessionStorage.getItem('cars21:pending-vendor');
          if (pendingVendor) {
            const pendingResponse = await fetch('/api/user/saved-vendors', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendorSlug: pendingVendor, saved: true }) });
            if (pendingResponse.ok) sessionStorage.removeItem('cars21:pending-vendor');
          }
        } catch {}
        const [saved, vendors] = await Promise.all([
          fetch('/api/user/wishlist', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/user/saved-vendors', { credentials: 'same-origin', cache: 'no-store' })
        ]);
        if (saved.ok) {
          const list = await saved.json();
          setWishlistIds(Array.isArray(list.ids) ? list.ids : []);
          setWishlistCars(Array.isArray(list.cars) ? list.cars : []);
        }
        if (vendors.ok) {
          const list = await vendors.json();
          setSavedVendorIds(Array.isArray(list.ids) ? list.ids : []);
          setSavedVendors(Array.isArray(list.vendors) ? list.vendors : []);
        }
      } else {
        setWishlistIds([]);
        setWishlistCars([]);
        setSavedVendorIds([]);
        setSavedVendors([]);
      }
    } catch {
      setBuyer(null);
      setWishlistIds([]);
      setWishlistCars([]);
      setSavedVendorIds([]);
      setSavedVendors([]);
    } finally {
      setLoadingBuyer(false);
    }
  }, []);
  useEffect(() => { void refreshBuyer(); }, [refreshBuyer]);
  const openLoginModal = useCallback((next?: string) => { const path = next || currentPath(); setReturnTo(path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : '/'); setLoginOpen(true); }, []);
  const closeLoginModal = useCallback(() => { setLoginOpen(false); if (pathname === '/login') router.replace('/'); }, [pathname, router]);
  const toggleWishlist = useCallback(async (carId: string): Promise<WishlistResult> => {
    if (!buyer) { try { sessionStorage.setItem('cars21:pending-wishlist', carId); } catch {} openLoginModal(currentPath()); return 'login'; }
    const saved = !wishlistIds.includes(carId);
    try { const response = await fetch('/api/user/wishlist', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carId, saved }) }); if (response.status === 401) { setBuyer(null); openLoginModal(currentPath()); return 'login'; } const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Wishlist could not be updated.'); setWishlistIds(current => saved ? [...new Set([...current, carId])] : current.filter(id => id !== carId)); const listResponse = await fetch('/api/user/wishlist', { credentials: 'same-origin', cache: 'no-store' }); if (listResponse.ok) { const list = await listResponse.json(); setWishlistCars(Array.isArray(list.cars) ? list.cars : []); } return saved ? 'saved' : 'removed'; }
    catch { return 'error'; }
  }, [buyer, openLoginModal, wishlistIds]);
  const toggleSavedVendor = useCallback(async (slug: string): Promise<WishlistResult> => {
    if (!buyer) { try { sessionStorage.setItem('cars21:pending-vendor', slug); } catch {} openLoginModal(currentPath()); return 'login'; }
    const vendor = savedVendors.find(item => item.slug === slug); const saved = !vendor;
    try { const response = await fetch('/api/user/saved-vendors', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendorSlug: slug, saved }) }); if (response.status === 401) { try { sessionStorage.setItem('cars21:pending-vendor', slug); } catch {} setBuyer(null); openLoginModal(currentPath()); return 'login'; } const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Saved dealers could not be updated.'); const listResponse = await fetch('/api/user/saved-vendors', { credentials: 'same-origin', cache: 'no-store' }); if (listResponse.ok) { const list = await listResponse.json(); setSavedVendorIds(Array.isArray(list.ids) ? list.ids : []); setSavedVendors(Array.isArray(list.vendors) ? list.vendors : []); } return saved ? 'saved' : 'removed'; }
    catch { return 'error'; }
  }, [buyer, openLoginModal, savedVendors]);
  const signOut = useCallback(async () => { await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => null); setBuyer(null); setWishlistIds([]); setWishlistCars([]); setSavedVendorIds([]); setSavedVendors([]); }, []);
  const value = useMemo(() => ({
    buyer,
    wishlistIds,
    wishlistCars,
    savedVendorIds,
    savedVendors,
    loadingBuyer,
    openLoginModal,
    closeLoginModal,
    toggleWishlist,
    toggleSavedVendor,
    refreshBuyer,
    signOut,
    isLeadCaptured,
    leadInfo,
    openBuyCarLeadModal,
    closeBuyCarLeadModal,
    saveLeadInfo,
    recordAction
  }), [
    buyer,
    wishlistIds,
    wishlistCars,
    savedVendorIds,
    savedVendors,
    loadingBuyer,
    openLoginModal,
    closeLoginModal,
    toggleWishlist,
    toggleSavedVendor,
    refreshBuyer,
    signOut,
    isLeadCaptured,
    leadInfo,
    openBuyCarLeadModal,
    closeBuyCarLeadModal,
    saveLeadInfo,
    recordAction
  ]);

  return (
    <Context.Provider value={value}>
      {children}
      <LoginModal open={loginOpen} returnTo={returnTo} onClose={closeLoginModal} />
      <BuyCarLeadModal
        open={leadModalOpen}
        onClose={closeBuyCarLeadModal}
        onSuccess={(lead) => {
          saveLeadInfo(lead);
          if (leadOnSuccess) {
            leadOnSuccess(lead);
          }
        }}
      />
    </Context.Provider>
  );
}
export function useBuyerExperience() { const value = useContext(Context); if (!value) throw new Error('useBuyerExperience must be used inside BuyerExperienceProvider.'); return value; }
