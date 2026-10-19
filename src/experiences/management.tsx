'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, BadgeCheck, Building2, CarFront, Check, ChevronDown, CircleDollarSign, ClipboardCheck, ClipboardList, CreditCard, Eye, FilePlus2, Gauge, Heart, History as HistoryIcon, ImagePlus, LayoutDashboard, LogOut, Mail, MapPin, Menu, MessageSquareText, Pencil, Plus, Search, ShieldCheck, Store, Trash2, UserRound, Users, X } from 'lucide-react';
import { formatINR } from '../data';
import { UserHistoryPanel } from '../components/UserHistoryPanel';
import { WishlistInsights } from '../components/WishlistInsights';
import { VendorProfileEditor, type VendorBusinessProfile } from '../components/VendorProfileEditor';
import { InspectionReviewPanel } from '../components/InspectionReviewPanel';
import { SubscriptionManager } from '../components/SubscriptionManager';
import { VendorDashboardOverview } from '../components/VendorDashboardOverview';

type Role = 'superadmin' | 'admin' | 'vendor';
type User = { role: Role; name: string; email?: string };
type CarRecord = { id: string; make: string; model: string; variant: string; year: number; km: number; fuel: string; transmission: string; owners: number; price: number; city: string; area?: string; body: string; score: number; badge: string; image?: string; imageId?: string; photoIds?: string[]; inspection?: Record<string, string | string[]> | null; inspectionReviewStatus?: string; inspectionReviewNote?: string; color?: string; sellerName?: string; sellerPhone?: string; sellerWhatsApp?: string; sellerUserId?: string; vendorId?: string; vendorName?: string; vendorSlug?: string; status?: string };
type Vendor = { id: string; name: string; businessName: string; email: string; phone: string; city: string; status: 'active' | 'suspended'; createdAt?: string; profileUrl?: string; subscription?: unknown };
type Account = { id: string; accountType: 'admin' | 'vendor'; name: string; businessName?: string; email: string; inquiryEmail?: string; inquiryWhatsApp?: string; phone?: string; city?: string; area?: string; address?: string; description?: string; website?: string; workingHours?: string; establishedYear?: number | null; specialties?: string[]; logoPhotoId?: string; coverPhotoId?: string; shopPhotoIds?: string[]; status: 'active' | 'suspended'; createdAt?: string; profileUrl?: string };
type Photo = { id: string; filename: string; contentType: string; length: number; uploadDate: string; usedBy: { id: string; label: string; kind: 'car' | 'vendor'; href: string } | null };
type Inquiry = { id: string; carId: string; createdAt: string; detailUrl: string; status: string; notifications?: { email?: { status: string; to?: string } }; vehicle: { make: string; model: string; variant: string; year: number; price: number; city: string; sellerName?: string; sellerPhone?: string; vendorId?: string }; client: { name: string; phone: string; email?: string; city: string; message?: string; preferredDate?: string; preferredTime?: string } };
type WebsiteSubmission = { id: string; type: 'seller' | 'dealer'; status: 'new' | 'contacted' | 'in_progress' | 'closed'; verificationStatus?: 'pending' | 'approved' | 'rejected'; userId?: string; createdAt: string; name: string; email: string; phone: string; city: string; businessName?: string; registration?: string; make?: string; model?: string; year?: number; km?: number; fuel?: string; transmission?: string; owners?: number; condition?: string; estimatedLow?: number; estimatedHigh?: number; inspectionMode?: string; preferredDate?: string; preferredTime?: string; address?: string };
type Section = 'overview' | 'listings' | 'vendors' | 'inquiries' | 'accounts' | 'photos' | 'submissions' | 'history' | 'wishlists' | 'profile' | 'inspections' | 'plans' | 'subscriptions';
type DashboardData = { activity: { date: string; label: string; count: number }[]; recentVendors: Vendor[]; updatedAt: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store', headers: { ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init?.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result as T;
}

const blankCar: Omit<CarRecord, 'id'> = { make: '', model: '', variant: '', year: new Date().getFullYear(), km: 0, fuel: 'Petrol', transmission: 'Automatic', owners: 1, price: 0, city: 'Bengaluru', area: '', body: 'SUV', score: 0, badge: 'Cars21 listing', image: '', color: '', sellerName: '', sellerPhone: '', sellerWhatsApp: '', status: 'active' };
const statusLabel: Record<string, string> = { active: 'Live', pending: 'Needs review', paused: 'Paused', sold: 'Sold', new: 'New', contacted: 'Contacted', in_progress: 'In progress', visit_booked: 'Visit booked', closed: 'Closed' };

export function ManagementPanel({ role: expectedRole }: { role: Role }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [section, setSection] = useState<Section>('overview');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [dashboard, setDashboard] = useState<DashboardData>({ activity: [], recentVendors: [], updatedAt: '' });
  const [cars, setCars] = useState<CarRecord[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submissions, setSubmissions] = useState<WebsiteSubmission[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('all');
  const [listingVendor, setListingVendor] = useState('all');
  const [vendorProfileUrl, setVendorProfileUrl] = useState('');
  const [vendorProfile, setVendorProfile] = useState<VendorBusinessProfile | null>(null);
  const [carEditor, setCarEditor] = useState<CarRecord | 'new' | null>(null);
  const [vendorEditor, setVendorEditor] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newAccountType, setNewAccountType] = useState<'admin' | 'vendor'>('vendor');
  const [newVendorPassword, setNewVendorPassword] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const refreshInFlight = useRef(false);

  async function refresh(role = expectedRole) {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setDataLoading(true);
    setError('');
    try {
      if (role !== 'vendor') {
        const [overview, inventory, partnerList, leadList, siteSubmissions] = await Promise.all([
          api<{ metrics: Record<string, number>; activity: DashboardData['activity']; recentVendors: Vendor[]; updatedAt: string }>('/api/admin/overview'), api<{ cars: CarRecord[] }>('/api/admin/cars'), api<{ vendors: Vendor[] }>('/api/admin/vendors'), api<{ inquiries: Inquiry[] }>('/api/inquiries'), api<{ submissions: WebsiteSubmission[] }>('/api/admin/submissions'),
        ]);
        setMetrics(overview.metrics); setDashboard({ activity: overview.activity, recentVendors: overview.recentVendors, updatedAt: overview.updatedAt }); setCars(inventory.cars); setVendors(partnerList.vendors); setInquiries(leadList.inquiries); setSubmissions(siteSubmissions.submissions);
        if (role === 'superadmin') {
          const [accountList, photoList] = await Promise.all([api<{ accounts: Account[] }>('/api/superadmin/users'), api<{ photos: Photo[] }>('/api/superadmin/photos')]);
          setAccounts(accountList.accounts); setPhotos(photoList.photos);
        }
      } else {
        const [inventory, leadList] = await Promise.all([api<{ cars: CarRecord[]; vendor?: VendorBusinessProfile }>('/api/vendor/cars'), api<{ inquiries: Inquiry[] }>('/api/inquiries')]);
        setCars(inventory.cars); setVendorProfile(inventory.vendor || null); setVendorProfileUrl(inventory.vendor?.profileUrl || ''); setInquiries(leadList.inquiries); setMetrics({ activeCars: inventory.cars.filter(car => car.status === 'active').length, pendingCars: inventory.cars.filter(car => car.status === 'pending').length, totalInquiries: leadList.inquiries.length, newInquiries: leadList.inquiries.filter(item => item.status === 'new').length });
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Workspace data could not be loaded.'); }
    finally { refreshInFlight.current = false; setDataLoading(false); }
  }

  useEffect(() => {
    let alive = true;
    api<{ user: { role: string; name: string; email?: string } | null }>('/api/auth/session').then(async result => {
      if (!alive) return;
      if (result.user && result.user.role !== expectedRole) {
        const destination = result.user.role === 'superadmin' ? '/superadmin' : result.user.role === 'admin' ? '/admin' : result.user.role === 'vendor' ? '/vendor' : '/account';
        if (window.location.pathname !== destination) router.replace(destination);
        else setError('This account does not have access to this management workspace.');
        return;
      }
      setUser(result.user as User | null);
      if (result.user) await refresh(expectedRole);
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : 'Could not check your session.'); }).finally(() => { if (alive) setAuthLoading(false); });
    return () => { alive = false; };
  }, [expectedRole, router]);

  useEffect(() => {
    if (!user || expectedRole === 'vendor' || section !== 'overview') return;
    let cancelled = false;
    let timeout = 0;
    const pollOverview = async () => {
      if (!document.hidden) {
        try {
          const overview = await api<{ metrics: Record<string, number>; activity: DashboardData['activity']; recentVendors: Vendor[]; updatedAt: string }>('/api/admin/overview');
          if (!cancelled) {
            setMetrics(overview.metrics);
            setDashboard({ activity: overview.activity, recentVendors: overview.recentVendors, updatedAt: overview.updatedAt });
          }
        } catch {
          // Keep the last good dashboard data and let the next scheduled refresh retry.
        }
      }
      if (!cancelled) timeout = window.setTimeout(pollOverview, 60000);
    };
    timeout = window.setTimeout(pollOverview, 60000);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [user, section, expectedRole]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setDataLoading(true);
    try {
      const credentials = expectedRole === 'superadmin' ? { identifier: identifier.trim() } : { email: email.trim() };
      const result = await api<{ user: User }>('/api/auth/session', { method: 'POST', body: JSON.stringify({ role: expectedRole, ...credentials, password }) });
      setUser(result.user); setPassword(''); await refresh(expectedRole);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sign in.'); }
    finally { setDataLoading(false); setAuthLoading(false); }
  }

  async function signOut() {
    await api('/api/auth/session', { method: 'DELETE' }).catch(() => null);
    setUser(null); setCars([]); setVendors([]); setInquiries([]); setAccounts([]); setSection('overview');
  }

  async function saveCar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const editing = carEditor !== 'new' && carEditor !== null ? carEditor : null;
    setDataLoading(true); setError(''); setNotice('');
    try {
      let imageId = String(values.get('imageId') || '');
      const currentPhotoIds = JSON.parse(String(values.get('photoIds') || '[]')) as string[];
      const evidencePhotoIds = JSON.parse(String(values.get('evidencePhotoIds') || '[]')) as string[];
      const listingFiles = values.getAll('photos').filter((file): file is File => file instanceof File && file.size > 0);
      const evidenceFiles = values.getAll('evidencePhotos').filter((file): file is File => file instanceof File && file.size > 0);
      const planImageLimit = vendorProfile?.subscription?.plan?.maxImagesPerListing || 0;
      if (expectedRole === 'vendor' && !planImageLimit) throw new Error('Your dealer subscription is inactive. Ask Cars21 to assign a plan before creating listings.');
      if (expectedRole === 'vendor' && currentPhotoIds.length + evidencePhotoIds.length + listingFiles.length + evidenceFiles.length > planImageLimit) throw new Error(`Your plan allows up to ${planImageLimit} photos per listing, including inspection evidence.`);
      const uploadPhoto = async (file: File) => { const upload = new FormData(); upload.append('file', file); return (await api<{ id: string }>('/api/photos', { method: 'POST', body: upload })).id; };
      const [uploadedListingPhotos, uploadedEvidencePhotos] = await Promise.all([Promise.all(listingFiles.map(uploadPhoto)), Promise.all(evidenceFiles.map(uploadPhoto))]);
      const nextPhotoIds = [...new Set([...currentPhotoIds, ...uploadedListingPhotos])];
      const nextEvidencePhotoIds = [...new Set([...evidencePhotoIds, ...uploadedEvidencePhotos])];
      if (!imageId && uploadedListingPhotos[0]) imageId = uploadedListingPhotos[0];
      if (expectedRole === 'vendor') {
        const requiredChecks = ['inspectionExterior','inspectionInterior','inspectionEngine','inspectionTyres','inspectionElectronics','inspectionDocuments','inspectionRoadTest','inspectionAccidentHistory'];
        if (requiredChecks.some(key => !String(values.get(key) || '').trim())) throw new Error('Complete each inspection condition before submitting the vehicle.');
        if (!nextEvidencePhotoIds.length) throw new Error('Upload at least one inspection evidence photo before submitting.');
      }
      const make = String(values.get('make')).trim(); const model = String(values.get('model')).trim();
      const id = editing?.id || `${values.get('year')}-${make}-${model}-${Math.random().toString(36).slice(2, 7)}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').slice(0, 80);
      const payload = { id, make, model, variant: String(values.get('variant')), year: Number(values.get('year')), km: Number(values.get('km')), fuel: String(values.get('fuel')), transmission: String(values.get('transmission')), owners: Number(values.get('owners')), price: Number(values.get('price')), city: String(values.get('city')), area: String(values.get('area') || ''), body: String(values.get('body')), score: Number(values.get('score')), badge: String(values.get('badge')), image: String(values.get('image')), imageId: imageId || undefined, photoIds: nextPhotoIds, inspection: expectedRole === 'vendor' ? { exterior: String(values.get('inspectionExterior') || ''), interior: String(values.get('inspectionInterior') || ''), engine: String(values.get('inspectionEngine') || ''), tyres: String(values.get('inspectionTyres') || ''), electronics: String(values.get('inspectionElectronics') || ''), documents: String(values.get('inspectionDocuments') || ''), roadTest: String(values.get('inspectionRoadTest') || ''), accidentHistory: String(values.get('inspectionAccidentHistory') || ''), notes: String(values.get('inspectionNotes') || ''), evidencePhotoIds: nextEvidencePhotoIds } : undefined, color: String(values.get('color')), sellerName: String(values.get('sellerName')), sellerPhone: String(values.get('sellerPhone')), sellerWhatsApp: String(values.get('sellerWhatsApp')), vendorId: expectedRole !== 'vendor' ? String(values.get('vendorId') || '') : undefined, status: expectedRole !== 'vendor' ? String(values.get('status')) : 'active' };
      await api('/api/cars', { method: 'POST', body: JSON.stringify(payload) });
      setCarEditor(null); setNotice(expectedRole === 'vendor' ? 'Listing is live for buyer enquiries. Your inspection packet is in Cars21 review.' : 'Listing saved.'); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Listing could not be saved.'); }
    finally { setDataLoading(false); }
  }

  async function removeCar(car: CarRecord) {
    if (!window.confirm(`Remove ${car.year} ${car.make} ${car.model}?`)) return;
    setError(''); try { await api(`/api/cars/${encodeURIComponent(car.id)}`, { method: 'DELETE' }); setNotice('Listing removed.'); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Listing could not be removed.'); }
  }

  async function addVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setDataLoading(true); setError('');
    try {
      const payload = Object.fromEntries(values.entries());
      const result = await api<{ account: Account; initialPassword: string }>('/api/superadmin/users', { method: 'POST', body: JSON.stringify({ ...payload, accountType: newAccountType }) });
      if (result.account.accountType === 'vendor') setVendors(current => [result.account as Vendor, ...current]);
      setAccounts(current => [result.account, ...current]); setNewVendorPassword(result.initialPassword); setVendorEditor(false); setNotice(`${newAccountType === 'admin' ? 'Admin' : 'Vendor'} account created. Save the one-time password now.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Vendor could not be created.'); }
    finally { setDataLoading(false); }
  }

  async function saveAccountDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAccount) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setDataLoading(true); setError('');
    try {
      const result = await api<{ ok: boolean; profileUrl?: string }>(`/api/superadmin/users/${encodeURIComponent(editingAccount.id)}`, { method: 'PATCH', body: JSON.stringify({ ...values, accountType: editingAccount.accountType }) });
      const updated = { ...editingAccount, name: String(values.name), email: String(values.email).toLowerCase(), ...(editingAccount.accountType === 'vendor' ? { businessName: String(values.businessName), phone: String(values.phone), city: String(values.city), profileUrl: result.profileUrl || editingAccount.profileUrl } : {}) };
      setAccounts(current => current.map(account => account.id === updated.id ? updated : account));
      if (updated.accountType === 'vendor') setVendors(current => current.map(vendor => vendor.id === updated.id ? { ...vendor, name: updated.name, businessName: updated.businessName || '', email: updated.email, phone: updated.phone || '', city: updated.city || '', profileUrl: updated.profileUrl } : vendor));
      setEditingAccount(null); setNotice('Account details updated.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Account details could not be updated.'); }
    finally { setDataLoading(false); }
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(`Permanently delete ${account.name}'s ${account.accountType} account? This cannot be undone.`)) return;
    try {
      await api(`/api/superadmin/users/${encodeURIComponent(account.id)}`, { method: 'DELETE', body: JSON.stringify({ accountType: account.accountType }) });
      setAccounts(current => current.filter(item => item.id !== account.id));
      if (account.accountType === 'vendor') setVendors(current => current.filter(item => item.id !== account.id));
      setNotice('Account permanently deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Account could not be deleted.'); }
  }

  async function setVendorStatus(vendor: Vendor) {
    const status = vendor.status === 'active' ? 'suspended' : 'active';
    try { await api(`/api/admin/vendors/${encodeURIComponent(vendor.id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setVendors(current => current.map(item => item.id === vendor.id ? { ...item, status } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Vendor could not be updated.'); }
  }

  async function resetVendorPassword(vendor: Vendor) {
    if (!window.confirm(`Issue a new sign-in password for ${vendor.businessName}? Their current password will stop working.`)) return;
    try { const result = await api<{ initialPassword: string }>(`/api/admin/vendors/${encodeURIComponent(vendor.id)}`, { method: 'POST' }); setNewVendorPassword(result.initialPassword); setNotice(`New one-time password created for ${vendor.businessName}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Password could not be reset.'); }
  }

  async function updateAccount(account: Account) {
    const status = account.status === 'active' ? 'suspended' : 'active';
    try {
      await api(`/api/superadmin/users/${encodeURIComponent(account.id)}`, { method: 'PATCH', body: JSON.stringify({ accountType: account.accountType, status }) });
      setAccounts(current => current.map(item => item.id === account.id ? { ...item, status } : item));
      if (account.accountType === 'vendor') setVendors(current => current.map(item => item.id === account.id ? { ...item, status } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Account could not be updated.'); }
  }

  async function resetAccountPassword(account: Account) {
    if (!window.confirm(`Issue a new sign-in password for ${account.name}? Their current password will stop working.`)) return;
    try {
      const result = await api<{ initialPassword: string }>(`/api/superadmin/users/${encodeURIComponent(account.id)}`, { method: 'POST', body: JSON.stringify({ accountType: account.accountType }) });
      setNewVendorPassword(result.initialPassword); setNotice(`New one-time password created for ${account.name}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Password could not be reset.'); }
  }

  async function updateInquiry(inquiry: Inquiry, status: string) {
    try { await api(`/api/inquiries/${encodeURIComponent(inquiry.id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setInquiries(current => current.map(item => item.id === inquiry.id ? { ...item, status } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Enquiry could not be updated.'); }
  }

  async function deleteInquiry(inquiry: Inquiry) {
    if (!window.confirm(`Permanently delete this enquiry from ${inquiry.client.name}? This cannot be undone.`)) return;
    try {
      await api(`/api/inquiries/${encodeURIComponent(inquiry.id)}`, { method: 'DELETE' });
      setInquiries(current => current.filter(item => item.id !== inquiry.id));
      setNotice('Enquiry permanently deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Enquiry could not be deleted.'); }
  }

  async function deletePhoto(photo: Photo) {
    const useNote = photo.usedBy ? ` It is currently attached to ${photo.usedBy.label}.` : '';
    if (!window.confirm(`Permanently delete ${photo.filename}?${useNote} This cannot be undone.`)) return;
    try {
      await api(`/api/superadmin/photos/${encodeURIComponent(photo.id)}`, { method: 'DELETE' });
      setPhotos(current => current.filter(item => item.id !== photo.id));
      setNotice(photo.usedBy ? 'Photo deleted and removed from its attached listing or vendor profile.' : 'Photo permanently deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Photo could not be deleted.'); }
  }

  async function updateSubmission(submission: WebsiteSubmission, status: WebsiteSubmission['status']) {
    try {
      await api(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, { method: 'PATCH', body: JSON.stringify({ type: submission.type, status }) });
      setSubmissions(current => current.map(item => item.id === submission.id && item.type === submission.type ? { ...item, status } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Submission could not be updated.'); }
  }

  async function verifyPrivateSeller(submission: WebsiteSubmission, verificationStatus: 'pending' | 'approved' | 'rejected') {
    try {
      await api(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, { method: 'PATCH', body: JSON.stringify({ type: 'seller', verificationStatus }) });
      setSubmissions(current => current.map(item => item.id === submission.id && item.type === 'seller' ? { ...item, verificationStatus } : item));
      setNotice(verificationStatus === 'approved' ? 'Private seller approved. Their profile can now create car listings.' : verificationStatus === 'rejected' ? 'Private seller request rejected.' : 'Private seller access returned to review.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Seller verification could not be updated.'); }
  }

  async function deleteSubmission(submission: WebsiteSubmission) {
    if (!window.confirm(`Permanently delete this ${submission.type === 'seller' ? 'seller request' : 'dealer application'} from ${submission.name}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, { method: 'DELETE', body: JSON.stringify({ type: submission.type }) });
      setSubmissions(current => current.filter(item => item.id !== submission.id || item.type !== submission.type));
      setNotice('Website submission permanently deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Submission could not be deleted.'); }
  }

  const filteredCars = useMemo(() => cars.filter(car => {
    const matchesText = `${car.year} ${car.make} ${car.model} ${car.variant} ${car.city} ${car.status} ${car.vendorName || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (listingStatus === 'all' || (car.status || 'active') === listingStatus) && (listingVendor === 'all' || car.vendorId === listingVendor);
  }), [cars, search, listingStatus, listingVendor]);
  const navItems: { id: Section; label: string; Icon: typeof LayoutDashboard }[] = expectedRole === 'vendor'
    ? [{ id: 'overview', label: 'Dashboard', Icon: LayoutDashboard }, { id: 'listings', label: 'My listings', Icon: CarFront }, { id: 'inquiries', label: 'Buyer enquiries', Icon: MessageSquareText }, { id: 'wishlists', label: 'Wishlist demand', Icon: Heart }, { id: 'profile', label: 'Business profile', Icon: Store }]
    : [{ id: 'overview', label: 'Overview', Icon: LayoutDashboard }, { id: 'listings', label: 'Car listings', Icon: CarFront }, { id: 'vendors', label: 'Vendors', Icon: Store }, { id: 'inquiries', label: 'Buyer enquiries', Icon: MessageSquareText }, { id: 'history', label: 'User history', Icon: HistoryIcon }, { id: 'wishlists', label: 'Wishlist demand', Icon: Heart }, { id: 'submissions', label: 'Website submissions', Icon: FilePlus2 }, ...(expectedRole === 'superadmin' ? [{ id: 'inspections' as Section, label: 'Inspection review', Icon: ClipboardCheck }, { id: 'plans' as Section, label: 'Subscription plans', Icon: CreditCard }, { id: 'subscriptions' as Section, label: 'Vendor subscriptions', Icon: BadgeCheck }, { id: 'photos' as Section, label: 'Photos', Icon: ImagePlus }, { id: 'accounts' as Section, label: 'Access & accounts', Icon: Users }] : [])];

  if (authLoading) return <main className="management-loading"><span className="loading-spinner"/> Opening secure workspace…</main>;
  if (!user) return <main className="management-login-shell"><a className="management-brand" href="/"><span><CarFront size={22}/></span>CARS<span>21</span></a><section className="management-login-card"><div className="management-login-icon">{expectedRole === 'vendor' ? <Building2/> : <ShieldCheck/>}</div><span className="eyebrow">CARS21 · PRIVATE WORKSPACE</span><h1>{expectedRole === 'superadmin' ? 'Superadmin sign in' : expectedRole === 'admin' ? 'Admin sign in' : 'Vendor sign in'}</h1><p>{expectedRole === 'superadmin' ? 'Manage platform access, administrators, vendors and marketplace operations.' : expectedRole === 'admin' ? 'Manage Cars21 inventory, vendors and buyer enquiries.' : 'Access only your dealership listings and buyer enquiries.'}</p><form onSubmit={signIn}>
    {expectedRole === 'superadmin' ? <label className="management-field">Superadmin username<input autoComplete="username" required value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="superadmin"/> </label> : <label className="management-field">Work email<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder={expectedRole === 'vendor' ? 'you@dealership.in' : 'you@cars21.in'}/></label>}
    <label className="management-field">Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder={expectedRole === 'superadmin' ? 'Environment configured password' : 'Your account password'}/></label>
    {error && <p className="management-error" role="alert">{error}</p>}<button className="management-primary" type="submit" disabled={dataLoading}>{dataLoading ? 'Signing in…' : 'Continue securely'} <ArrowDownToLine size={17}/></button></form><div className="management-login-foot"><a href={expectedRole === 'vendor' ? '/admin' : '/vendor'}>Switch to {expectedRole === 'vendor' ? 'admin' : 'vendor'} sign in <ArrowLeft size={14}/></a><a href="/">Back to Cars21 <Eye size={14}/></a></div><p className="management-security"><ShieldCheck size={14}/> Secure, role-limited access. Credentials are never stored in the browser.</p></section></main>;

  const heading = navItems.find(item => item.id === section)?.label || 'Workspace';
  const counts = expectedRole !== 'vendor' ? [{ label: 'All listings', value: metrics.totalCars ?? cars.length, Icon: CarFront, tone: 'blue', note: 'Across the marketplace' }, { label: 'Live inventory', value: metrics.activeCars ?? 0, Icon: BadgeCheck, tone: 'green', note: 'Visible to shoppers' }, { label: 'Pending review', value: metrics.pendingCars ?? 0, Icon: ClipboardList, tone: 'amber', note: 'Needs your approval' }, { label: 'Active vendors', value: metrics.activeVendors ?? 0, Icon: Store, tone: 'violet', note: `${metrics.totalVendors ?? 0} registered partners` }] : [{ label: 'My listings', value: cars.length, Icon: CarFront, tone: 'blue', note: 'Across your workspace' }, { label: 'Live', value: metrics.activeCars ?? 0, Icon: BadgeCheck, tone: 'green', note: 'Visible to shoppers' }, { label: 'In review', value: metrics.pendingCars ?? 0, Icon: ClipboardList, tone: 'amber', note: 'Awaiting Cars21' }, { label: 'New enquiries', value: metrics.newInquiries ?? 0, Icon: MessageSquareText, tone: 'violet', note: 'Buyer follow-ups' }];

  return <main className="management-shell">
    <aside className={`management-sidebar${mobileNavOpen ? ' is-open' : ''}`}><a className="management-brand" href="/"><span><CarFront size={22}/></span>CARS<span>21</span></a><div className="management-workspace-label">{expectedRole === 'superadmin' ? 'SUPERADMIN CONSOLE' : expectedRole === 'admin' ? 'OPERATIONS CONSOLE' : 'VENDOR WORKSPACE'}</div><nav aria-label="Workspace navigation">{navItems.map(({ id, label, Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => { setSection(id); setMobileNavOpen(false); }}><Icon size={18}/>{label}{id === 'inquiries' && metrics.newInquiries ? <b>{metrics.newInquiries}</b> : null}</button>)}</nav><div className="management-sidebar-bottom"><div className="management-help-card"><ShieldCheck size={17}/><b>{expectedRole === 'vendor' ? 'Your workspace' : expectedRole === 'superadmin' ? 'Platform access' : 'Control at a glance'}</b><span>{expectedRole === 'vendor' ? 'Only your account’s listings and leads are shown.' : expectedRole === 'superadmin' ? 'Manage admin and vendor access from one place.' : 'Review vehicle status before it appears on Cars21.'}</span></div><a href="/" className="management-back-link"><ArrowLeft size={15}/> View marketplace</a></div></aside>
    {mobileNavOpen && <button className="management-nav-scrim" aria-label="Close workspace navigation" onClick={() => setMobileNavOpen(false)}/>}
    <div className="management-main"><header className="management-topbar"><button className="management-menu-toggle" aria-label="Open workspace navigation" onClick={() => setMobileNavOpen(open => !open)}><Menu size={20}/></button><div><span className="management-breadcrumb">{expectedRole === 'superadmin' ? 'Superadmin' : expectedRole === 'admin' ? 'Admin' : 'Vendor'} workspace</span><h1>{heading}</h1></div><div className="management-top-actions">{expectedRole === 'vendor' && vendorProfileUrl && <a className="management-refresh" href={vendorProfileUrl} target="_blank" rel="noreferrer"><Eye size={16}/><span>Public profile</span></a>}<button className="management-refresh" onClick={() => refresh()} aria-label="Refresh workspace"><Gauge size={17}/><span>Refresh</span></button><div className="management-user"><span className="management-avatar"><UserRound size={17}/></span><span><b>{user.name}</b><small>{expectedRole === 'superadmin' ? 'Superadmin' : expectedRole === 'admin' ? 'Administrator' : user.email}</small></span></div><button className="management-logout" onClick={signOut} aria-label="Sign out"><LogOut size={17}/></button></div></header>
      <section className="management-content">
        {error && <div className="management-banner error" role="alert"><X size={17}/>{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
        {notice && <div className="management-banner success" role="status"><Check size={17}/>{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15}/></button></div>}
        {newVendorPassword && <div className="vendor-password-banner"><div><b>One-time account password</b><span>Share it securely now. It won’t be shown again.</span><code>{newVendorPassword}</code></div><button onClick={() => { void navigator.clipboard?.writeText(newVendorPassword); setNotice('Password copied.'); }}>Copy password</button><button aria-label="Dismiss password" onClick={() => setNewVendorPassword('')}><X size={16}/></button></div>}
        {section === 'overview' && expectedRole === 'vendor' && <VendorDashboardOverview profile={vendorProfile} cars={cars} inquiries={inquiries} onNavigate={setSection}/>}
        {section === 'overview' && expectedRole !== 'vendor' && <>
          <div className="management-welcome"><div><span className="eyebrow">{expectedRole === 'superadmin' ? 'CARS21 PLATFORM ADMINISTRATION' : 'CARS21 OPERATIONS'}</span><h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}.</h2><p>{expectedRole === 'superadmin' ? 'Manage platform users alongside marketplace operations.' : 'Your marketplace at a glance. Review pending listings and new buyer enquiries first.'}</p></div><div className="management-live"><i/> Workspace connected</div></div>
          <div className="management-metric-grid">{counts.map(({ label, value, Icon, tone, note }) => <article className="management-metric" key={label}><span className={`management-metric-icon ${tone}`}><Icon size={18}/></span><span>{label}</span><b>{dataLoading ? '—' : value.toLocaleString('en-IN')}</b><small>{note}</small></article>)}</div>
          <div className="management-dashboard-grid">
            <article className="management-dashboard-card"><div className="management-dashboard-card-heading"><div><span className="eyebrow">BUYER ACTIVITY</span><h3>Enquiries this week</h3></div><span className="management-dashboard-total"><b>{metrics.totalInquiries ?? inquiries.length}</b><small>{metrics.newInquiries ?? 0} new</small></span></div><div className="management-activity-chart" role="img" aria-label="Buyer enquiries received over the last seven days">{dashboard.activity.map(day => { const peak = Math.max(1, ...dashboard.activity.map(item => item.count)); return <div className="management-activity-day" key={day.date}><span>{day.count}</span><div><i style={{ height: `${Math.max(6, day.count / peak * 100)}%` }}/></div><small>{day.label}</small></div>})}</div><div className="management-dashboard-foot"><Activity size={14}/> Updates automatically every 15 seconds <span>{dashboard.updatedAt ? `· Updated ${new Date(dashboard.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div></article>
            <article className="management-dashboard-card"><div className="management-dashboard-card-heading"><div><span className="eyebrow">PARTNER NETWORK</span><h3>Recently added vendors</h3></div><button className="management-inline-link" onClick={() => setSection('vendors')}>All vendors <ArrowUpRight size={14}/></button></div><div className="management-recent-vendors">{dashboard.recentVendors.slice(0, 4).map(vendor => <div className="management-recent-vendor" key={vendor.id}><span><Building2 size={16}/></span><div><b>{vendor.businessName}</b><small>{vendor.city} · {vendor.name}</small></div><StatusPill value={vendor.status}/></div>)}{dashboard.recentVendors.length === 0 && <div className="management-vendor-empty"><Store size={18}/>Vendor accounts will appear here when created.</div>}</div>{expectedRole === 'superadmin' ? <button className="management-dashboard-cta" onClick={() => { setSection('accounts'); setNewAccountType('vendor'); setVendorEditor(true); }}>Add a vendor <ArrowUpRight size={15}/></button> : <button className="management-dashboard-cta" onClick={() => setSection('vendors')}>Review vendor accounts <ArrowUpRight size={15}/></button>}</article>
          </div>
          <div className="management-section-heading"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Recent buyer enquiries</h2></div><button onClick={() => setSection('inquiries')}>View all enquiries <ArrowLeft size={15}/></button></div>
          <InquiryList inquiries={inquiries.slice(0, 4)} onStatus={updateInquiry} onDelete={expectedRole === 'superadmin' ? deleteInquiry : undefined} />
          <div className="management-shortcuts"><button onClick={() => { setSection('listings'); setCarEditor('new'); }}><Plus size={18}/><span><b>Add a vehicle</b><small>Create a listing or review vendor submissions</small></span><ArrowLeft size={16}/></button>{expectedRole === 'superadmin' && <button onClick={() => { setSection('accounts'); setVendorEditor(true); }}><Users size={18}/><span><b>Create an account</b><small>Add an administrator or vendor</small></span><ArrowLeft size={16}/></button>}</div>
        </>}
        {section === 'listings' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">{expectedRole === 'vendor' ? 'YOUR INVENTORY' : 'MARKETPLACE INVENTORY'}</span><h2>{expectedRole === 'vendor' ? 'Manage your listings' : 'Vehicle listings'}</h2><p>{expectedRole === 'vendor' ? 'Listings stay visible for enquiries while their inspection packets are reviewed.' : 'Create, edit, publish or remove vehicles across Cars21.'}</p></div><button className="management-primary compact" disabled={expectedRole==='vendor'&&(!vendorProfile?.subscription||cars.filter(car=>car.status==='active'||car.status==='pending').length>=(vendorProfile.subscription.plan?.maxListings||0))} onClick={() => setCarEditor('new')}><Plus size={17}/> Add vehicle</button></div><div className="management-toolbar management-listing-filters"><label className="management-search"><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search make, model, city…" aria-label="Search vehicle listings"/></label>{expectedRole !== 'vendor' && <label className="management-filter">Dealer<select value={listingVendor} onChange={event => setListingVendor(event.target.value)}><option value="all">All dealers</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.businessName}</option>)}</select></label>}<label className="management-filter">Status<select value={listingStatus} onChange={event => setListingStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Live</option><option value="pending">Needs review</option><option value="paused">Paused</option><option value="sold">Sold</option></select></label><span>{filteredCars.length} {filteredCars.length === 1 ? 'listing' : 'listings'}</span></div><div className="management-listings">{filteredCars.map(car => <article className="management-car-row" key={car.id}><div className="management-car-image">{car.image ? <img src={car.image} alt={`${car.year} ${car.make} ${car.model}`}/> : <CarFront size={22}/>}</div><div className="management-car-name"><b>{car.year} {car.make} {car.model}</b><span>{car.variant || 'Standard'} · {car.city}</span><small>{car.vendorName || (car.vendorId ? 'Dealer listing' : car.sellerUserId ? `Private seller · ${car.sellerName || 'Verified seller'}` : 'Cars21 direct')} · {car.id}</small></div><strong className="management-price">{formatINR(car.price)}</strong><div><StatusPill value={car.status || 'active'}/>{car.vendorId&&car.inspectionReviewStatus&&<small className="inspection-listing-status">Inspection · {car.inspectionReviewStatus.replace('_',' ')}</small>}</div><div className="management-row-actions">{car.vendorSlug && <a href={`/dealers/${car.vendorSlug}`} target="_blank" rel="noreferrer" aria-label={`View ${car.vendorName || 'dealer'} profile`}><Eye size={16}/></a>}<button aria-label={`Edit ${car.make} ${car.model}`} onClick={() => setCarEditor(car)}><Pencil size={16}/></button><button className="danger" aria-label={`Remove ${car.make} ${car.model}`} onClick={() => void removeCar(car)}><Trash2 size={16}/></button></div></article>)}{filteredCars.length === 0 && <div className="management-empty"><CarFront size={25}/><b>{dataLoading ? 'Loading inventory…' : 'No listings found'}</b><span>{search || listingStatus !== 'all' || listingVendor !== 'all' ? 'Try changing your search or filters.' : 'Add your first vehicle to get started.'}</span></div>}</div></>}
        {section === 'vendors' && expectedRole !== 'vendor' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">PARTNER ACCOUNTS</span><h2>Vendors</h2><p>{expectedRole === 'superadmin' ? 'Review dealership accounts and their marketplace access.' : 'Review dealership access and marketplace activity.'}</p></div>{expectedRole === 'superadmin' && <button className="management-primary compact" onClick={() => { setNewAccountType('vendor'); setVendorEditor(true); }}><Plus size={17}/> Create vendor</button>}</div><div className="management-vendor-grid">{vendors.map(vendor => <article className="management-vendor-card" key={vendor.id}><div className="management-vendor-top"><span className="management-vendor-icon"><Building2 size={20}/></span><StatusPill value={vendor.status}/></div><h3>{vendor.businessName}</h3><p className="management-vendor-person">{vendor.name}</p><a href={`mailto:${vendor.email}`}><Mail size={14}/>{vendor.email}</a><span><MapPin size={14}/>{vendor.city} · {vendor.phone}</span>{vendor.profileUrl && <a href={vendor.profileUrl} target="_blank" rel="noreferrer"><Eye size={14}/>Open public dealer page</a>}<div className="management-vendor-bottom"><small>Added {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('en-IN') : 'recently'}</small><div>{expectedRole === 'superadmin' && <button className="reset" onClick={() => { const account = accounts.find(item => item.accountType === 'vendor' && item.id === vendor.id); if (account) { setEditingAccount(account); setVendorEditor(true); } }}>Edit profile</button>}{expectedRole === 'admin' && <button className="reset" onClick={() => void resetVendorPassword(vendor)}>Reset password</button>}<button className={vendor.status === 'active' ? 'suspend' : 'activate'} onClick={() => void setVendorStatus(vendor)}>{vendor.status === 'active' ? 'Suspend' : 'Reactivate'}</button></div></div></article>)}{vendors.length === 0 && <div className="management-empty"><Store size={25}/><b>No vendors yet</b><span>{expectedRole === 'superadmin' ? 'Create a vendor account from here or the Access & accounts page.' : 'Vendor accounts will appear here when created.'}</span></div>}</div></>}
        {section === 'photos' && expectedRole === 'superadmin' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">GRIDFS MEDIA</span><h2>Photos and showroom images</h2><p>Review listing and vendor profile photos. Removing an attached photo also clears its profile or listing reference.</p></div><div className="management-inquiry-total"><b>{photos.length}</b><span>Recent photos</span></div></div><div className="management-vendor-grid">{photos.map(photo => <article className="management-vendor-card management-photo-card" key={photo.id}><a className="management-photo-preview" href={`/api/photos/${encodeURIComponent(photo.id)}`} target="_blank" rel="noreferrer"><img src={`/api/photos/${encodeURIComponent(photo.id)}`} alt={photo.filename}/></a><h3 title={photo.filename}>{photo.filename}</h3><p className="management-vendor-person">{photo.contentType} · {Math.max(1, Math.round(photo.length / 1024))} KB</p>{photo.usedBy ? <a href={photo.usedBy.href} target="_blank" rel="noreferrer">{photo.usedBy.kind === 'vendor' ? <Store size={14}/> : <CarFront size={14}/>} {photo.usedBy.label}</a> : <span><ImagePlus size={14}/>Not attached to a listing or profile</span>}<div className="management-vendor-bottom"><small>{new Date(photo.uploadDate).toLocaleDateString('en-IN')}</small><div><button className="suspend" onClick={() => void deletePhoto(photo)}>Delete photo</button></div></div></article>)}{photos.length === 0 && <div className="management-empty"><ImagePlus size={25}/><b>No stored photos</b><span>Uploaded listing and showroom images will appear here.</span></div>}</div></>}
        {section === 'accounts' && expectedRole === 'superadmin' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">PLATFORM ACCESS</span><h2>Admins and vendors</h2><p>Create, edit, suspend, reset or remove platform accounts.</p></div><button className="management-primary compact" onClick={() => { setEditingAccount(null); setNewAccountType('admin'); setVendorEditor(true); }}><Plus size={17}/> Create account</button></div><div className="management-vendor-grid">{accounts.map(account => <article className="management-vendor-card" key={`${account.accountType}-${account.id}`}><div className="management-vendor-top"><span className="management-vendor-icon">{account.accountType === 'admin' ? <ShieldCheck size={20}/> : <Building2 size={20}/>}</span><StatusPill value={account.status}/></div><h3>{account.accountType === 'admin' ? account.name : account.businessName}</h3><p className="management-vendor-person">{account.accountType === 'admin' ? 'Administrator' : account.name}</p><a href={`mailto:${account.email}`}><Mail size={14}/>{account.email}</a>{account.accountType === 'vendor' && <><span><MapPin size={14}/>{account.city} · {account.phone}</span>{account.profileUrl && <a href={account.profileUrl} target="_blank" rel="noreferrer"><Eye size={14}/>Open public dealer page</a>}</>}<div className="management-vendor-bottom"><small>{account.accountType === 'admin' ? 'Admin workspace' : 'Vendor workspace'}</small><div><button className="reset" onClick={() => { setEditingAccount(account); setVendorEditor(true); }}>Edit details</button><button className="reset" onClick={() => void resetAccountPassword(account)}>Reset password</button><button className={account.status === 'active' ? 'suspend' : 'activate'} onClick={() => void updateAccount(account)}>{account.status === 'active' ? 'Suspend' : 'Reactivate'}</button><button className="suspend" onClick={() => void deleteAccount(account)}>Delete</button></div></div></article>)}{accounts.length === 0 && <div className="management-empty"><Users size={25}/><b>No created accounts</b><span>Create the first admin or vendor login. Superadmin access remains configured in the environment.</span></div>}</div></>}
        {section === 'submissions' && expectedRole !== 'vendor' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">PUBLIC WEBSITE FORMS</span><h2>Website submissions</h2><p>Seller inspection requests and dealer partnership applications appear here after submission.</p></div><div className="management-inquiry-total"><b>{submissions.length}</b><span>Total submissions</span></div></div>{submissions.length ? <div className="management-vendor-grid">{submissions.map(item => <article className="management-vendor-card" key={`${item.type}-${item.id}`}><div className="management-vendor-top"><span className="management-vendor-icon">{item.type === 'seller' ? <CarFront size={20}/> : <Building2 size={20}/>}</span><StatusPill value={item.status}/></div><h3>{item.type === 'seller' ? `${item.year} ${item.make} ${item.model}` : item.businessName}</h3><p className="management-vendor-person">{item.type === 'seller' ? `Seller request · ${item.registration}` : `Dealer application · ${item.name}`}</p><a href={`mailto:${item.email}`}><Mail size={14}/>{item.email || 'Email not provided'}</a><a href={`tel:${item.phone}`}><UserRound size={14}/>{item.phone}</a><span><MapPin size={14}/>{item.city}</span>{item.type === 'seller' && <p className="management-vendor-person">{item.km?.toLocaleString('en-IN')} km · {item.fuel} · {item.condition} · Estimate {formatINR(item.estimatedLow || 0)}–{formatINR(item.estimatedHigh || 0)}{item.preferredDate ? ` · ${item.preferredDate} ${item.preferredTime || ''}` : ''}</p>}<div className="management-vendor-bottom"><small>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small><div><label className="management-submission-status">Status<select value={item.status} onChange={event => void updateSubmission(item, event.target.value as WebsiteSubmission['status'])}><option value="new">New</option><option value="contacted">Contacted</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>{item.type === 'seller' && <label className="management-submission-status">Seller access<select aria-label="Private seller verification" value={item.verificationStatus || 'pending'} onChange={event => void verifyPrivateSeller(item, event.target.value as 'pending' | 'approved' | 'rejected')}><option value="pending">Needs review</option><option value="approved">Approve seller</option><option value="rejected">Reject request</option></select></label>}{expectedRole === 'superadmin' && <button className="suspend" onClick={() => void deleteSubmission(item)}>Delete</button>}</div></div></article>)}</div> : <div className="management-empty"><FilePlus2 size={25}/><b>No website submissions yet</b><span>Completed seller requests and dealer applications will appear here.</span></div>}</>}
        {section === 'inspections' && expectedRole === 'superadmin' && <InspectionReviewPanel/>}
        {section === 'plans' && expectedRole === 'superadmin' && <SubscriptionManager view="plans"/>}
        {section === 'subscriptions' && expectedRole === 'superadmin' && <SubscriptionManager view="subscriptions"/>}
        {section === 'history' && expectedRole !== 'vendor' && <UserHistoryPanel/>}
        {section === 'wishlists' && <WishlistInsights vendor={expectedRole === 'vendor'}/>}
        {section === 'profile' && expectedRole === 'vendor' && (vendorProfile ? <VendorProfileEditor key={vendorProfile.id} initial={vendorProfile} endpoint="/api/vendor/profile" onSaved={(updated, profileUrl) => { setVendorProfile({ ...updated, profileUrl: profileUrl || updated.profileUrl }); if (profileUrl) setVendorProfileUrl(profileUrl); }}/> : <div className="management-empty"><Store size={25}/><b>Business profile unavailable</b><span>Refresh your workspace and try again.</span></div>)}
        {section === 'inquiries' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">BUYER RELATIONSHIPS</span><h2>{expectedRole === 'vendor' ? 'Buyer enquiries' : 'All enquiries'}</h2><p>{expectedRole === 'vendor' ? 'Enquiries for your own listings only. Contact buyers and update each request.' : 'Follow each buyer request and keep its next step up to date.'}</p></div><div className="management-inquiry-total"><b>{inquiries.length}</b><span>Total enquiries</span></div></div><InquiryList inquiries={inquiries} onStatus={updateInquiry} onDelete={expectedRole === 'superadmin' ? deleteInquiry : undefined} /></>}
      </section>
    </div>
    {carEditor && <CarEditor car={carEditor === 'new' ? null : carEditor} role={expectedRole === 'vendor' ? 'vendor' : 'admin'} vendors={vendors.filter(vendor => vendor.status === 'active')} imageLimit={vendorProfile?.subscription?.plan?.maxImagesPerListing || 20} saving={dataLoading} onClose={() => setCarEditor(null)} onSubmit={saveCar}/>}
    {vendorEditor && expectedRole === 'superadmin' && <Modal title={editingAccount ? `Edit ${editingAccount.accountType} account` : `Create ${newAccountType} account`} onClose={() => { setVendorEditor(false); setEditingAccount(null); }}>
      {editingAccount?.accountType === 'vendor' ? <VendorProfileEditor key={editingAccount.id} initial={{ id: editingAccount.id, name: editingAccount.name, businessName: editingAccount.businessName || '', email: editingAccount.email, inquiryEmail: editingAccount.inquiryEmail || editingAccount.email, inquiryWhatsApp: editingAccount.inquiryWhatsApp || editingAccount.phone || '', phone: editingAccount.phone || '', city: editingAccount.city || '', area: editingAccount.area || '', address: editingAccount.address || '', description: editingAccount.description || '', website: editingAccount.website || '', workingHours: editingAccount.workingHours || '', establishedYear: editingAccount.establishedYear || null, specialties: editingAccount.specialties || [], logoPhotoId: editingAccount.logoPhotoId || '', coverPhotoId: editingAccount.coverPhotoId || '', shopPhotoIds: editingAccount.shopPhotoIds || [], profileUrl: editingAccount.profileUrl }} endpoint={`/api/superadmin/users/${encodeURIComponent(editingAccount.id)}`} superadmin editableEmail onSaved={(updated, profileUrl) => { const next = { ...editingAccount, ...updated, profileUrl: profileUrl || updated.profileUrl }; setAccounts(current => current.map(account => account.id === next.id ? next : account)); setVendors(current => current.map(vendor => vendor.id === next.id ? { ...vendor, ...next } : vendor)); setVendorEditor(false); setEditingAccount(null); setNotice('Vendor profile updated. The public dealer page now uses these details.'); }}/>
      : <form key={editingAccount?.id || 'new-account'} className="management-form" onSubmit={editingAccount ? saveAccountDetails : addVendor}><p>{editingAccount ? 'Update this account’s profile details.' : newAccountType === 'admin' ? 'Administrators can manage marketplace listings, vendors and buyer enquiries. Only the environment-configured superadmin can create accounts.' : 'Vendors receive access to their own listings and buyer enquiries only.'}</p><label className="management-field">Account type<select value={editingAccount?.accountType || newAccountType} disabled={Boolean(editingAccount)} onChange={event => setNewAccountType(event.target.value as 'admin' | 'vendor')}><option value="admin">Administrator</option><option value="vendor">Vendor</option></select></label><label className="management-field">{(editingAccount?.accountType || newAccountType) === 'admin' ? 'Full name' : 'Contact name'}<input required name="name" autoComplete="name" maxLength={100} defaultValue={editingAccount?.name || ''} placeholder="Alex Sharma"/></label>{(editingAccount?.accountType || newAccountType) === 'vendor' && <label className="management-field">Dealership name<input required name="businessName" maxLength={120} defaultValue={editingAccount?.businessName || ''} placeholder="Northstar Motors"/></label>}<div className="management-form-pair"><label className="management-field">Work email<input required name="email" type="email" autoComplete="email" maxLength={160} defaultValue={editingAccount?.email || ''} placeholder={(editingAccount?.accountType || newAccountType) === 'admin' ? 'alex@cars21.in' : 'alex@northstar.in'}/></label>{(editingAccount?.accountType || newAccountType) === 'vendor' && <label className="management-field">Phone<input required name="phone" type="tel" maxLength={24} defaultValue={editingAccount?.phone || ''} placeholder="+91 98765 43210"/></label>}</div>{(editingAccount?.accountType || newAccountType) === 'vendor' && <label className="management-field">City<input required name="city" maxLength={80} defaultValue={editingAccount?.city || ''} placeholder="Bengaluru"/></label>}<div className="management-form-actions"><button type="button" className="management-secondary" onClick={() => { setVendorEditor(false); setEditingAccount(null); }}>Cancel</button><button className="management-primary" disabled={dataLoading}>{dataLoading ? 'Saving…' : editingAccount ? 'Save details' : 'Create account'} <Check size={16}/></button></div></form>}
    </Modal>}
  </main>;
}

function StatusPill({ value }: { value: string }) { return <span className={`management-status ${value}`}>{statusLabel[value] || value}</span>; }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose]);
  return <div className="management-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="management-modal" role="dialog" aria-modal="true" aria-labelledby="management-modal-title"><header><h2 id="management-modal-title">{title}</h2><button aria-label="Close dialog" onClick={onClose}><X size={19}/></button></header>{children}</section></div>;
}

function CarEditor({ car, role, vendors, imageLimit, saving, onClose, onSubmit }: { car: CarRecord | null; role: Role; vendors: Vendor[]; imageLimit: number; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const value = car || blankCar;
  const inspection = value.inspection || {};
  return <Modal title={car ? `Edit ${car.make} ${car.model}` : 'Add a vehicle'} onClose={onClose}><form className="management-form management-car-form" onSubmit={onSubmit}>
    <div className="management-form-pair"><label className="management-field">Make<input required name="make" defaultValue={value.make} maxLength={60} placeholder="Tata"/></label><label className="management-field">Model<input required name="model" defaultValue={value.model} maxLength={80} placeholder="Nexon EV"/></label></div>
    <div className="management-form-pair"><label className="management-field">Variant<input name="variant" defaultValue={value.variant} maxLength={120} placeholder="XZ+ Lux"/></label><label className="management-field">Model year<input required name="year" type="number" min="1980" max="2100" defaultValue={value.year}/></label></div>
    <div className="management-form-pair"><label className="management-field">Price (₹)<input required name="price" type="number" min="1" defaultValue={value.price}/></label><label className="management-field">Kilometres<input required name="km" type="number" min="0" defaultValue={value.km}/></label></div>
    <div className="management-form-pair"><label className="management-field">City<input required name="city" defaultValue={value.city} maxLength={60}/></label><label className="management-field">Area / locality<input name="area" defaultValue={value.area || ''} maxLength={80} placeholder="Koramangala"/></label></div>
    <label className="management-field">Body type<select name="body" defaultValue={value.body}><option>SUV</option><option>Sedan</option><option>Hatchback</option><option>Electric</option><option>Coupe</option><option>MPV</option></select></label>
    <div className="management-form-pair"><label className="management-field">Fuel<select name="fuel" defaultValue={value.fuel}><option>Petrol</option><option>Diesel</option><option>Electric</option><option>CNG</option><option>Hybrid</option></select></label><label className="management-field">Transmission<select name="transmission" defaultValue={value.transmission}><option>Automatic</option><option>Manual</option></select></label></div>
    <div className="management-form-pair"><label className="management-field">Owners<input name="owners" type="number" min="1" max="10" defaultValue={value.owners}/></label>{role!=='vendor'&&<label className="management-field">Inspection score<input name="score" type="number" min="0" max="100" defaultValue={value.score}/></label>}</div>
    <div className="management-form-pair"><label className="management-field">Colour<input name="color" defaultValue={value.color || ''}/></label><label className="management-field">Listing badge<input name="badge" defaultValue={value.badge} maxLength={60}/></label></div>
    <div className="management-form-pair"><label className="management-field">Seller name<input name="sellerName" defaultValue={value.sellerName || ''}/></label><label className="management-field">Seller phone<input name="sellerPhone" type="tel" defaultValue={value.sellerPhone || ''}/></label></div>
    <label className="management-field">Seller WhatsApp<input name="sellerWhatsApp" type="tel" defaultValue={value.sellerWhatsApp || ''}/></label>
    <label className="management-field">Listing photos<input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple/><small>{role==='vendor'?imageLimit?`Up to ${imageLimit} photos total per vehicle, including inspection evidence.`:'An active subscription is needed to upload listing photos.':'JPEG, PNG, WebP or AVIF · up to 4 MB each'}</small></label>
    {(value.photoIds?.length||value.imageId)&&<div className="management-car-photo-previews">{(value.photoIds?.length?value.photoIds:value.imageId?[value.imageId]:[]).slice(0,20).map((id,index)=><img key={`${id}-${index}`} src={`/api/photos/${encodeURIComponent(id)}`} alt={`Current listing photo ${index+1}`}/>)}</div>}
    <label className="management-field">Or image URL<input name="image" type="url" defaultValue={value.image || ''} placeholder="https://…"/></label>
    <input type="hidden" name="imageId" value={value.imageId || ''}/>
    <input type="hidden" name="photoIds" value={JSON.stringify(value.photoIds || (value.imageId?[value.imageId]:[]))}/>
    {role==='vendor'&&<fieldset className="inspection-packet-fields"><legend>Inspection details for Cars21 review</legend><p>Fill what you can verify and attach clear photos. Your vehicle can receive enquiries while the report is being reviewed.</p>{[['inspectionExterior','Exterior body & paint','Scratches, dents, repaint, glass'],['inspectionInterior','Interior & upholstery','Seats, odometer, controls'],['inspectionEngine','Engine & transmission','Leaks, warning lights, gears'],['inspectionTyres','Tyres & brakes','Tread, age, brake feel'],['inspectionElectronics','Electrical & safety','Lights, AC, airbags, sensors'],['inspectionDocuments','Documents','RC, insurance, service history'],['inspectionRoadTest','Road test','Noise, steering, braking, ride'],['inspectionAccidentHistory','Accident / repair history','Disclose known repairs and claims']].map(([name,label,placeholder])=><label className="management-field" key={name}>{label}<textarea name={name} rows={2} maxLength={500} defaultValue={String(inspection[name]||'')} placeholder={placeholder}/></label>)}<label className="management-field">Additional notes<textarea name="inspectionNotes" rows={3} maxLength={2000} defaultValue={String(inspection.notes||'')} placeholder="Anything else the reviewer should know."/></label><label className="management-field">Inspection evidence photos<input name="evidencePhotos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple/><small>Evidence photos count toward your plan’s per-listing photo limit.</small></label><input type="hidden" name="evidencePhotoIds" value={JSON.stringify(Array.isArray(inspection.evidencePhotoIds)?inspection.evidencePhotoIds:[])}/>{Array.isArray(inspection.evidencePhotoIds)&&inspection.evidencePhotoIds.length>0&&<div className="management-car-photo-previews">{inspection.evidencePhotoIds.map((id,index)=><img key={`${id}-${index}`} src={`/api/photos/${encodeURIComponent(id)}`} alt={`Current inspection evidence ${index+1}`}/>)}</div>}</fieldset>}
    {role === 'admin' && <div className="management-form-pair"><label className="management-field">Vendor<select name="vendorId" defaultValue={value.vendorId || ''}><option value="">Cars21 direct listing</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.businessName}</option>)}</select></label><label className="management-field">Visibility<select name="status" defaultValue={value.status || 'active'}><option value="active">Live</option><option value="pending">Needs review</option><option value="paused">Paused</option><option value="sold">Sold</option></select></label></div>}
    {role === 'vendor' && <div className="management-review-note"><ShieldCheck size={16}/> Inspection is reviewed by Cars21; your listing will stay visible for enquiries while the review is pending.</div>}
    <div className="management-form-actions"><button type="button" className="management-secondary" onClick={onClose}>Cancel</button><button className="management-primary" disabled={saving}>{saving ? 'Saving…' : car ? 'Save changes' : role === 'vendor' ? 'Publish listing & submit inspection' : 'Create listing'} <Check size={16}/></button></div>
  </form></Modal>;
}

function InquiryList({ inquiries, onStatus, onDelete }: { inquiries: Inquiry[]; onStatus: (inquiry: Inquiry, status: string) => void; onDelete?: (inquiry: Inquiry) => void }) {
  if (!inquiries.length) return <div className="management-empty"><MessageSquareText size={25}/><b>No enquiries yet</b><span>Buyer requests will appear here when they ask about a vehicle.</span></div>;
  return <div className="management-inquiry-list">{inquiries.map(inquiry => <article className="management-inquiry-card" key={inquiry.id}><div className="management-inquiry-heading"><div><StatusPill value={inquiry.status}/><time>{new Date(inquiry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time></div><a href={`/car/${encodeURIComponent(inquiry.carId || '')}`} target="_blank" rel="noreferrer">View car <Eye size={14}/></a></div><div className="management-inquiry-columns"><div><span className="eyebrow">VEHICLE</span><h3>{inquiry.vehicle.year} {inquiry.vehicle.make} {inquiry.vehicle.model}</h3><p>{inquiry.vehicle.variant} · {inquiry.vehicle.city}</p><b>{formatINR(inquiry.vehicle.price)}</b></div><div><span className="eyebrow">BUYER</span><h3>{inquiry.client.name}</h3><a href={`tel:${inquiry.client.phone}`}>{inquiry.client.phone}</a>{inquiry.client.email && <a href={`mailto:${inquiry.client.email}`}>{inquiry.client.email}</a>}<p>{inquiry.client.city}{inquiry.client.preferredDate ? ` · ${inquiry.client.preferredDate}` : ''}{inquiry.client.preferredTime ? ` · ${inquiry.client.preferredTime}` : ''}</p></div>{inquiry.client.message && <div className="management-inquiry-message"><span className="eyebrow">MESSAGE</span><p>{inquiry.client.message}</p></div>}</div><div className="inquiry-notification-state">Dealer email: {inquiry.notifications?.email?.status==='sent'?'Sent':inquiry.notifications?.email?.status==='failed'?'Delivery failed':'Mail provider not configured'}{inquiry.notifications?.email?.to?` · ${inquiry.notifications.email.to}`:''}</div><div className="management-inquiry-actions"><label>Update status<select value={inquiry.status} onChange={event => onStatus(inquiry, event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="visit_booked">Visit booked</option><option value="closed">Closed</option></select></label>{onDelete && <button className="management-secondary" onClick={() => onDelete(inquiry)}><Trash2 size={15}/> Delete enquiry</button>}</div></article>)}</div>;
}
