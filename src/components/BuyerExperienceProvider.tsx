'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Car } from '../data';
import { LoginModal } from './LoginModal';

export type BuyerProfile = { name: string; email: string; picture?: string; phone?: string; city?: string };
export type SavedVendor = { id: string; slug: string; name: string; businessName: string; city: string; listingCount: number };
type WishlistResult = 'saved' | 'removed' | 'login' | 'error';
type BuyerExperience = { buyer: BuyerProfile | null; wishlistIds: string[]; wishlistCars: Car[]; savedVendorIds: string[]; savedVendors: SavedVendor[]; loadingBuyer: boolean; openLoginModal: (returnTo?: string) => void; closeLoginModal: () => void; toggleWishlist: (carId: string) => Promise<WishlistResult>; toggleSavedVendor: (slug: string) => Promise<WishlistResult>; refreshBuyer: () => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<BuyerExperience | null>(null);
function currentPath() { return typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}${window.location.hash}`; }

export function BuyerExperienceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null); const [wishlistIds, setWishlistIds] = useState<string[]>([]); const [wishlistCars, setWishlistCars] = useState<Car[]>([]); const [loadingBuyer, setLoadingBuyer] = useState(true);
  const [savedVendorIds, setSavedVendorIds] = useState<string[]>([]); const [savedVendors, setSavedVendors] = useState<SavedVendor[]>([]);
  const [loginOpen, setLoginOpen] = useState(false); const [returnTo, setReturnTo] = useState('/');
  const refreshBuyer = useCallback(async () => {
    try { const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }); const result = await response.json(); const profile = result.user?.role === 'buyer' ? result.user as BuyerProfile : null; setBuyer(profile); if (profile) { try { const pendingCar = sessionStorage.getItem('cars21:pending-wishlist'); if (pendingCar) { const pendingResponse = await fetch('/api/user/wishlist', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carId: pendingCar, saved: true }) }); if (pendingResponse.ok) sessionStorage.removeItem('cars21:pending-wishlist'); } const pendingVendor = sessionStorage.getItem('cars21:pending-vendor'); if (pendingVendor) { const pendingResponse = await fetch('/api/user/saved-vendors', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendorSlug: pendingVendor, saved: true }) }); if (pendingResponse.ok) sessionStorage.removeItem('cars21:pending-vendor'); } } catch {} const [saved, vendors] = await Promise.all([fetch('/api/user/wishlist', { credentials: 'same-origin', cache: 'no-store' }), fetch('/api/user/saved-vendors', { credentials: 'same-origin', cache: 'no-store' })]); if (saved.ok) { const list = await saved.json(); setWishlistIds(Array.isArray(list.ids) ? list.ids : []); setWishlistCars(Array.isArray(list.cars) ? list.cars : []); } if (vendors.ok) { const list = await vendors.json(); setSavedVendorIds(Array.isArray(list.ids) ? list.ids : []); setSavedVendors(Array.isArray(list.vendors) ? list.vendors : []); } } else { setWishlistIds([]); setWishlistCars([]); setSavedVendorIds([]); setSavedVendors([]); } }
    catch { setBuyer(null); setWishlistIds([]); setWishlistCars([]); setSavedVendorIds([]); setSavedVendors([]); } finally { setLoadingBuyer(false); }
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
  const value = useMemo(() => ({ buyer, wishlistIds, wishlistCars, savedVendorIds, savedVendors, loadingBuyer, openLoginModal, closeLoginModal, toggleWishlist, toggleSavedVendor, refreshBuyer, signOut }), [buyer, wishlistIds, wishlistCars, savedVendorIds, savedVendors, loadingBuyer, openLoginModal, closeLoginModal, toggleWishlist, toggleSavedVendor, refreshBuyer, signOut]);
  return <Context.Provider value={value}>{children}<LoginModal open={loginOpen} returnTo={returnTo} onClose={closeLoginModal}/></Context.Provider>;
}
export function useBuyerExperience() { const value = useContext(Context); if (!value) throw new Error('useBuyerExperience must be used inside BuyerExperienceProvider.'); return value; }
