'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, BadgeCheck, Building2, CarFront, Check, CheckCircle2, ChevronDown, CircleDollarSign, ClipboardCheck, ClipboardList, CreditCard, Download, ExternalLink, Eye, EyeOff, FilePlus2, FileText, Gauge, Gavel, Globe2, Heart, History as HistoryIcon, ImagePlus, Key, Landmark, LayoutDashboard, LogOut, Mail, MapPin, Menu, MessageSquareText, Pencil, Phone, Plus, RefreshCw, Search, ShieldAlert, ShieldCheck, Store, Trash2, UserCheck, UserRound, Users, X, XCircle } from 'lucide-react';
import { formatINR } from '../data';
import { UserHistoryPanel } from '../components/UserHistoryPanel';
import { WishlistInsights } from '../components/WishlistInsights';
import { VendorProfileEditor, type VendorBusinessProfile } from '../components/VendorProfileEditor';
import { InspectionReviewPanel } from '../components/InspectionReviewPanel';
import { SubscriptionManager } from '../components/SubscriptionManager';
import { VendorDashboardOverview } from '../components/VendorDashboardOverview';
import { CityManager } from '../components/CityManager';
import { VehicleCompanyManager } from '../components/VehicleCompanyManager';
import { LoanManager } from '../components/LoanManager';
import { SellInquiryManager } from '../components/SellInquiryManager';
import { AuctionManager } from '../components/AuctionManager';
import { IndexingManager } from '../components/IndexingManager';

type Role = 'superadmin' | 'admin' | 'vendor';
type User = { role: Role; name: string; email?: string };
type CarRecord = {
  id: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  km: number;
  fuel: string;
  transmission: string;
  owners: number;
  price: number;
  city: string;
  area?: string;
  body: string;
  score: number;
  badge: string;
  image?: string;
  imageId?: string;
  photoIds?: string[];
  documentPhotoId?: string;
  documentNumber?: string;
  documentType?: string;
  verificationStatus?: 'unverified' | 'under_verification' | 'verified' | 'rejected';
  verificationNote?: string;
  verifiedBy?: { id: string; name: string; role: string; at: string } | null;
  addedBy?: { id: string; name: string; email?: string; role: string };
  inspection?: Record<string, string | string[]> | null;
  inspectionReviewStatus?: string;
  inspectionReviewNote?: string;
  color?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerWhatsApp?: string;
  sellerUserId?: string;
  vendorId?: string;
  vendorName?: string;
  vendorSlug?: string;
  status?: string;
};
type Vendor = {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  city: string;
  status: 'active' | 'suspended';
  slug?: string;
  createdAt?: string;
  profileUrl?: string;
  subscription?: unknown;
  addedBy?: { id: string; name: string; email?: string; role: string } | null;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
};
type CarModelItem = {
  id: string;
  name: string;
  body?: string;
  years?: number[];
  popular?: boolean;
  status?: 'active' | 'inactive';
};
type MakeItem = {
  id: string;
  name: string;
  country?: string;
  code?: string;
  popular?: boolean;
  status?: 'active' | 'inactive';
  models?: CarModelItem[];
};
type CityItem = { id: string; name: string; state: string; pincode?: string; popular?: boolean };
type Account = { id: string; accountType: 'admin' | 'vendor'; name: string; businessName?: string; email: string; inquiryEmail?: string; inquiryWhatsApp?: string; phone?: string; city?: string; area?: string; address?: string; description?: string; website?: string; workingHours?: string; establishedYear?: number | null; specialties?: string[]; logoPhotoId?: string; coverPhotoId?: string; shopPhotoIds?: string[]; status: 'active' | 'suspended'; createdAt?: string; profileUrl?: string; assignedAdminId?: string | null; assignedAdminName?: string | null; addedBy?: { id: string; name: string; email?: string; role: string } | null; };
type Photo = { id: string; filename: string; contentType: string; length: number; uploadDate: string; usedBy: { id: string; label: string; kind: 'car' | 'vendor'; href: string } | null };
type Inquiry = { id: string; carId: string; createdAt: string; detailUrl: string; status: string; notifications?: { email?: { status: string; to?: string } }; vehicle: { make: string; model: string; variant: string; year: number; price: number; city: string; sellerName?: string; sellerPhone?: string; vendorId?: string }; client: { name: string; phone: string; email?: string; city: string; message?: string; preferredDate?: string; preferredTime?: string } };
type WebsiteSubmission = { id: string; type: 'seller' | 'dealer'; status: 'new' | 'contacted' | 'in_progress' | 'closed'; verificationStatus?: 'pending' | 'approved' | 'rejected'; userId?: string; createdAt: string; name: string; email: string; phone: string; city: string; businessName?: string; registration?: string; make?: string; model?: string; year?: number; km?: number; fuel?: string; transmission?: string; owners?: number; condition?: string; estimatedLow?: number; estimatedHigh?: number; inspectionMode?: string; preferredDate?: string; preferredTime?: string; address?: string };
type Section = 'overview' | 'listings' | 'auctions' | 'cities' | 'makes' | 'loans' | 'sell-inquiries' | 'vendors' | 'seo' | 'inquiries' | 'accounts' | 'photos' | 'submissions' | 'history' | 'wishlists' | 'profile' | 'inspections' | 'plans' | 'subscriptions';
type DashboardData = { activity: { date: string; label: string; count: number }[]; recentVendors: Vendor[]; updatedAt: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store', headers: { ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init?.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result as T;
}

const DEFAULT_FALLBACK_MAKES: MakeItem[] = [
  {
    id: 'maruti-suzuki',
    name: 'Maruti Suzuki',
    popular: true,
    models: [
      { id: 'swift', name: 'Swift', body: 'Hatchback', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'brezza', name: 'Brezza', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'baleno', name: 'Baleno', body: 'Hatchback', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'grand-vitara', name: 'Grand Vitara', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'fronx', name: 'Fronx', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'dzire', name: 'Dzire', body: 'Sedan', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'ertiga', name: 'Ertiga', body: 'MUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'jimny', name: 'Jimny', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    popular: true,
    models: [
      { id: 'creta', name: 'Creta', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'venue', name: 'Venue', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'exter', name: 'Exter', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'verna', name: 'Verna', body: 'Sedan', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'i20', name: 'i20', body: 'Hatchback', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'alcazar', name: 'Alcazar', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'tucson', name: 'Tucson', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'ioniq-5', name: 'Ioniq 5', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    id: 'tata',
    name: 'Tata',
    popular: true,
    models: [
      { id: 'nexon', name: 'Nexon', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'punch', name: 'Punch', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'harrier', name: 'Harrier', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'safari', name: 'Safari', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'curvv', name: 'Curvv', body: 'SUV Coupe', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'altroz', name: 'Altroz', body: 'Hatchback', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'tiago', name: 'Tiago', body: 'Hatchback', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    id: 'mahindra',
    name: 'Mahindra',
    popular: true,
    models: [
      { id: 'thar', name: 'Thar', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'thar-roxx', name: 'Thar Roxx', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'scorpio-n', name: 'Scorpio-N', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'scorpio-classic', name: 'Scorpio Classic', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'xuv700', name: 'XUV700', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'xuv-3xo', name: 'XUV 3XO', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'bolero', name: 'Bolero', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    id: 'toyota',
    name: 'Toyota',
    popular: true,
    models: [
      { id: 'fortuner', name: 'Fortuner', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'innova-crysta', name: 'Innova Crysta', body: 'MUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'innova-hycross', name: 'Innova Hycross', body: 'MUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'hyryder', name: 'Urban Cruiser Hyryder', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'glanza', name: 'Glanza', body: 'Hatchback', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'taisor', name: 'Urban Cruiser Taisor', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    id: 'kia',
    name: 'Kia',
    popular: true,
    models: [
      { id: 'seltos', name: 'Seltos', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'sonet', name: 'Sonet', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'carens', name: 'Carens', body: 'MUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'ev6', name: 'EV6', body: 'SUV', years: [2022, 2023, 2024, 2025, 2026], popular: true, status: 'active' },
    ]
  },
  { id: 'honda', name: 'Honda', popular: true },
  { id: 'volkswagen', name: 'Volkswagen', popular: true },
  { id: 'skoda', name: 'Skoda', popular: false },
  { id: 'mg', name: 'MG', popular: false },
  { id: 'renault', name: 'Renault', popular: false },
  { id: 'nissan', name: 'Nissan', popular: false },
  { id: 'bmw', name: 'BMW', popular: false },
  { id: 'mercedes-benz', name: 'Mercedes-Benz', popular: false },
  { id: 'audi', name: 'Audi', popular: false },
  { id: 'jeep', name: 'Jeep', popular: false },
  { id: 'volvo', name: 'Volvo', popular: false },
];

const DEFAULT_FALLBACK_CITIES: CityItem[] = [
  { id: 'junagadh-ho', name: 'Junagadh (HO)', state: 'Gujarat', pincode: '362001', popular: true },
  { id: 'junagadh-city', name: 'Junagadh City (Sardarbag)', state: 'Gujarat', pincode: '362002', popular: true },
  { id: 'junagadh-jau', name: 'Junagadh (JAU / Motibaug)', state: 'Gujarat', pincode: '362003', popular: false },
  { id: 'joshipura', name: 'Joshipura (Junagadh)', state: 'Gujarat', pincode: '362004', popular: false },
  { id: 'bilkha', name: 'Bilkha (Junagadh)', state: 'Gujarat', pincode: '362011', popular: false },
  { id: 'dungarpur', name: 'Dungarpur (Junagadh)', state: 'Gujarat', pincode: '362015', popular: false },
  { id: 'bhesan', name: 'Bhesan (Junagadh)', state: 'Gujarat', pincode: '362020', popular: false },
  { id: 'keshod', name: 'Keshod (Junagadh)', state: 'Gujarat', pincode: '362220', popular: false },
  { id: 'mangrol', name: 'Mangrol (Junagadh)', state: 'Gujarat', pincode: '362225', popular: false },
  { id: 'manavadar', name: 'Manavadar (Junagadh)', state: 'Gujarat', pincode: '362150', popular: false },
  { id: 'vanthali', name: 'Vanthali (Junagadh)', state: 'Gujarat', pincode: '362110', popular: false },
  { id: 'mendarda', name: 'Mendarda (Junagadh)', state: 'Gujarat', pincode: '362120', popular: false },
  { id: 'visavadar', name: 'Visavadar (Junagadh)', state: 'Gujarat', pincode: '362130', popular: false },
  { id: 'chorwad', name: 'Chorwad (Junagadh)', state: 'Gujarat', pincode: '362250', popular: false },
  { id: 'veraval', name: 'Veraval (Gir Somnath)', state: 'Gujarat', pincode: '362265', popular: false },
  { id: 'talala', name: 'Talala Gir (Junagadh)', state: 'Gujarat', pincode: '362275', popular: false },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', pincode: '380001', popular: true },
  { id: 'surat', name: 'Surat', state: 'Gujarat', pincode: '395001', popular: true },
  { id: 'rajkot', name: 'Rajkot', state: 'Gujarat', pincode: '360001', popular: false },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', pincode: '560001', popular: true },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', pincode: '400001', popular: true },
  { id: 'delhi-ncr', name: 'Delhi NCR', state: 'Delhi', pincode: '110001', popular: true },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', pincode: '500001', popular: true },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', pincode: '411001', popular: true },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', pincode: '600001', popular: true },
];

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
  const [makes, setMakes] = useState<MakeItem[]>(DEFAULT_FALLBACK_MAKES);
  const [cities, setCities] = useState<CityItem[]>(DEFAULT_FALLBACK_CITIES);
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'admin' | 'vendor'>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('all');
  const [listingVendor, setListingVendor] = useState('all');
  const [vendorProfileUrl, setVendorProfileUrl] = useState('');
  const [vendorProfile, setVendorProfile] = useState<VendorBusinessProfile | null>(null);
  const [carEditor, setCarEditor] = useState<CarRecord | 'new' | null>(null);
  const [reviewingCar, setReviewingCar] = useState<CarRecord | null>(null);
  const [vendorEditor, setVendorEditor] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newAccountType, setNewAccountType] = useState<'admin' | 'vendor'>('vendor');
  const [newVendorPassword, setNewVendorPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [passwordResetTarget, setPasswordResetTarget] = useState<{ id: string; name: string; email: string; accountType: 'admin' | 'vendor' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formPassword, setFormPassword] = useState('');
  const [resetModalPassword, setResetModalPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const refreshInFlight = useRef(false);

  function generateFriendlyPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$';
    let res = 'C21@';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  async function refresh(role = expectedRole) {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setDataLoading(true);
    setError('');
    try {
      // Load vehicle makes and listed cities for all roles so dropdowns are always dynamic
      void Promise.all([
        api<{ makes: MakeItem[] }>('/api/admin/makes').catch(() => ({ makes: [] })),
        api<{ cities: CityItem[] }>('/api/admin/cities').catch(() => ({ cities: [] })),
      ]).then(([makesRes, citiesRes]) => {
        if (makesRes.makes?.length) setMakes(makesRes.makes);
        if (citiesRes.cities?.length) setCities(citiesRes.cities);
      });

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
      const planImageLimit = vendorProfile?.subscription?.plan?.maxImagesPerListing || 20;
      if (expectedRole === 'vendor' && vendorProfile?.subscription?.plan && currentPhotoIds.length + evidencePhotoIds.length + listingFiles.length + evidenceFiles.length > planImageLimit) throw new Error(`Your plan allows up to ${planImageLimit} photos per listing, including inspection evidence.`);
      const uploadPhoto = async (file: File) => { const upload = new FormData(); upload.append('file', file); return (await api<{ id: string }>('/api/photos', { method: 'POST', body: upload })).id; };
      const [uploadedListingPhotos, uploadedEvidencePhotos] = await Promise.all([Promise.all(listingFiles.map(uploadPhoto)), Promise.all(evidenceFiles.map(uploadPhoto))]);
      const nextPhotoIds = [...new Set([...currentPhotoIds, ...uploadedListingPhotos])];
      const nextEvidencePhotoIds = [...new Set([...evidencePhotoIds, ...uploadedEvidencePhotos])];
      if (!imageId && uploadedListingPhotos[0]) imageId = uploadedListingPhotos[0];

      // Vehicle document upload
      const docFile = values.get('documentFile');
      let documentPhotoId = String(values.get('documentPhotoId') || '');
      if (docFile instanceof File && docFile.size > 0) {
        const upload = new FormData();
        upload.append('file', docFile);
        const uploadedDoc = await api<{ id: string }>('/api/photos', { method: 'POST', body: upload });
        documentPhotoId = uploadedDoc.id;
      }
      const documentNumber = String(values.get('documentNumber') || '').trim();
      const documentType = String(values.get('documentType') || 'RC / Registration Certificate').trim();
      const explicitVerificationStatus = values.get('verificationStatus') ? String(values.get('verificationStatus')) : undefined;

      if (expectedRole === 'vendor') {
        const requiredChecks = ['inspectionExterior','inspectionInterior','inspectionEngine','inspectionTyres','inspectionElectronics','inspectionDocuments','inspectionRoadTest','inspectionAccidentHistory'];
        if (requiredChecks.some(key => !String(values.get(key) || '').trim())) throw new Error('Complete each inspection condition before submitting the vehicle.');
        if (!nextEvidencePhotoIds.length) throw new Error('Upload at least one inspection evidence photo before submitting.');
      }
      const make = String(values.get('make')).trim(); const model = String(values.get('model')).trim();
      const id = editing?.id || `${values.get('year')}-${make}-${model}-${Math.random().toString(36).slice(2, 7)}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').slice(0, 80);
      const payload = {
        id,
        make,
        model,
        variant: String(values.get('variant')),
        year: Number(values.get('year')),
        km: Number(values.get('km')),
        fuel: String(values.get('fuel')),
        transmission: String(values.get('transmission')),
        owners: Number(values.get('owners')),
        price: Number(values.get('price')),
        city: String(values.get('city')),
        area: String(values.get('area') || ''),
        body: String(values.get('body')),
        score: Number(values.get('score')),
        badge: String(values.get('badge')),
        image: String(values.get('image')),
        imageId: imageId || undefined,
        photoIds: nextPhotoIds,
        documentPhotoId: documentPhotoId || undefined,
        documentNumber: documentNumber || undefined,
        documentType: documentType || undefined,
        verificationStatus: explicitVerificationStatus,
        inspection: expectedRole === 'vendor' ? { exterior: String(values.get('inspectionExterior') || ''), interior: String(values.get('inspectionInterior') || ''), engine: String(values.get('inspectionEngine') || ''), tyres: String(values.get('inspectionTyres') || ''), electronics: String(values.get('inspectionElectronics') || ''), documents: String(values.get('inspectionDocuments') || ''), roadTest: String(values.get('inspectionRoadTest') || ''), accidentHistory: String(values.get('inspectionAccidentHistory') || ''), notes: String(values.get('inspectionNotes') || ''), evidencePhotoIds: nextEvidencePhotoIds } : undefined,
        color: String(values.get('color')),
        sellerName: String(values.get('sellerName')),
        sellerPhone: String(values.get('sellerPhone')),
        sellerWhatsApp: String(values.get('sellerWhatsApp')),
        vendorId: expectedRole !== 'vendor' ? String(values.get('vendorId') || '') : undefined,
        status: expectedRole !== 'vendor' ? String(values.get('status')) : 'active'
      };
      await api('/api/cars', { method: 'POST', body: JSON.stringify(payload) });
      setCarEditor(null); setNotice(expectedRole === 'vendor' ? 'Listing is live for buyer enquiries. Your RC document is in Cars21 review.' : 'Listing saved.'); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Listing could not be saved.'); }
    finally { setDataLoading(false); }
  }

  async function verifyCarDoc(car: CarRecord, status: 'verified' | 'rejected' | 'under_verification' | 'unverified', note?: string) {
    setDataLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await api<{ success: boolean; verificationStatus: string; verifiedBy?: any; verificationNote?: string }>(`/api/admin/cars/${encodeURIComponent(car.id)}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note })
      });
      const updatedCar: CarRecord = {
        ...car,
        verificationStatus: status,
        verificationNote: note !== undefined ? note : car.verificationNote,
        verifiedBy: res.verifiedBy || { id: user?.name || 'admin', name: user?.name || 'Admin', role: user?.role || 'admin', at: new Date().toISOString() }
      };
      setCars(current => current.map(item => item.id === car.id ? updatedCar : item));
      setReviewingCar(current => (current && current.id === car.id ? updatedCar : current));
      setNotice(
        status === 'verified'
          ? `Vehicle ${car.year} ${car.make} ${car.model} RC verified & approved ✓.`
          : status === 'rejected'
          ? `Vehicle RC document marked as rejected.`
          : status === 'under_verification'
          ? `Vehicle RC marked under verification.`
          : `Vehicle marked as unverified.`
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update document verification status.');
    } finally {
      setDataLoading(false);
    }
  }

  async function removeCar(car: CarRecord) {
    if (!window.confirm(`Remove ${car.year} ${car.make} ${car.model}?`)) return;
    setError(''); try { await api(`/api/cars/${encodeURIComponent(car.id)}`, { method: 'DELETE' }); setNotice('Listing removed.'); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Listing could not be removed.'); }
  }

  async function addVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setDataLoading(true);
    setModalError('');
    setError('');
    try {
      const payload = Object.fromEntries(values.entries());
      const accountType = (payload.accountType as 'admin' | 'vendor') || newAccountType;
      const customPw = formPassword.trim();
      let createdAccount: Account;
      let initialPw: string;

      if (expectedRole === 'admin') {
        const res = await api<{ vendor: Vendor; initialPassword: string }>('/api/admin/vendors', {
          method: 'POST',
          body: JSON.stringify({ ...payload, password: customPw || undefined })
        });
        createdAccount = { ...res.vendor, accountType: 'vendor' as const };
        initialPw = res.initialPassword;
      } else {
        const res = await api<{ account: Account; initialPassword: string }>('/api/superadmin/users', { 
          method: 'POST', 
          body: JSON.stringify({ 
            ...payload, 
            accountType, 
            password: customPw || undefined 
          }) 
        });
        createdAccount = res.account;
        initialPw = res.initialPassword;
      }

      if (createdAccount.accountType === 'vendor') setVendors(current => [createdAccount as Vendor, ...current.filter(v => v.id !== createdAccount.id)]);
      setAccounts(current => [createdAccount, ...current.filter(item => item.id !== createdAccount.id)]);
      setNewVendorPassword(initialPw);
      setVendorEditor(false);
      setFormPassword('');
      setShowPassword(false);
      setNotice(`${accountType === 'admin' ? 'Administrator' : 'Vendor'} account created. Save the password now.`);
      if (accountType === 'admin') {
        setSection('accounts');
        setAccountFilter('admin');
      }
      await refresh();
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : `${newAccountType === 'admin' ? 'Admin' : 'Vendor'} could not be created.`;
      setModalError(msg);
      setError(msg);
    }
    finally { setDataLoading(false); }
  }

  async function assignVendorToAdmin(vendor: Vendor, targetAdminId: string) {
    setDataLoading(true);
    setError('');
    setNotice('');
    try {
      const selectedAdmin = accounts.find(a => a.id === targetAdminId);
      const adminName = selectedAdmin ? selectedAdmin.name : '';
      await api(`/api/admin/vendors/${encodeURIComponent(vendor.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedAdminId: targetAdminId,
          assignedAdminName: adminName,
        })
      });
      setVendors(current => current.map(v => v.id === vendor.id ? { ...v, assignedAdminId: targetAdminId || null, assignedAdminName: adminName || null } : v));
      setAccounts(current => current.map(a => a.id === vendor.id ? { ...a, assignedAdminId: targetAdminId || null, assignedAdminName: adminName || null } : a));
      setNotice(targetAdminId ? `Vendor "${vendor.businessName}" assigned to administrator ${adminName}.` : `Vendor "${vendor.businessName}" is now unassigned.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not assign administrator.');
    } finally {
      setDataLoading(false);
    }
  }

  async function requestDealerIndexing(vendor: Vendor) {
    try {
      setNotice(`Requesting Google Search Console indexing for ${vendor.businessName}...`);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const dealerPath = vendor.profileUrl || `/dealers/${vendor.slug || vendor.id}`;
      const fullUrl = dealerPath.startsWith('http') ? dealerPath : `${origin}${dealerPath}`;
      const res = await api<{ success: boolean; pendingCredentials?: boolean }>('/api/admin/indexing', {
        method: 'POST',
        body: JSON.stringify({ url: fullUrl }),
      });
      if (res.pendingCredentials) {
        setNotice(`Indexing queued for ${vendor.businessName}. Configure Google Cloud Service Account in .env.local to transmit live.`);
      } else {
        setNotice(`Google Search Console notified for ${vendor.businessName}!`);
      }
    } catch {
      setError('Failed to request Google indexing.');
    }
  }

  async function saveAccountDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAccount) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setDataLoading(true); setModalError(''); setError('');
    try {
      const customPw = formPassword.trim();
      const patchPayload: Record<string, any> = { ...values, accountType: editingAccount.accountType };
      if (customPw) {
        patchPayload.password = customPw;
      }
      const result = await api<{ ok: boolean; profileUrl?: string }>(`/api/superadmin/users/${encodeURIComponent(editingAccount.id)}`, { method: 'PATCH', body: JSON.stringify(patchPayload) });
      const assignedAdmin = accounts.find(a => a.id === values.assignedAdminId);
      const updated = {
        ...editingAccount,
        name: String(values.name),
        email: String(values.email).toLowerCase(),
        ...(editingAccount.accountType === 'vendor' ? {
          businessName: String(values.businessName),
          phone: String(values.phone),
          city: String(values.city),
          profileUrl: result.profileUrl || editingAccount.profileUrl,
          assignedAdminId: values.assignedAdminId ? String(values.assignedAdminId) : null,
          assignedAdminName: assignedAdmin ? assignedAdmin.name : null,
        } : {})
      };
      setAccounts(current => current.map(account => account.id === updated.id ? updated : account));
      if (updated.accountType === 'vendor') setVendors(current => current.map(vendor => vendor.id === updated.id ? { ...vendor, name: updated.name, businessName: updated.businessName || '', email: updated.email, phone: updated.phone || '', city: updated.city || '', profileUrl: updated.profileUrl, assignedAdminId: updated.assignedAdminId, assignedAdminName: updated.assignedAdminName } : vendor));
      setVendorEditor(false); setEditingAccount(null); setFormPassword(''); setShowPassword(false);
      setNotice(customPw ? 'Account details and password updated.' : 'Account details updated.');
      await refresh();
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'Account details could not be updated.';
      setModalError(msg); setError(msg);
    }
    finally { setDataLoading(false); }
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(`Permanently delete ${account.name}'s ${account.accountType} account? This cannot be undone.`)) return;
    try {
      await api(`/api/superadmin/users/${encodeURIComponent(account.id)}`, { method: 'DELETE', body: JSON.stringify({ accountType: account.accountType }) });
      setAccounts(current => current.filter(item => item.id !== account.id));
      if (account.accountType === 'vendor') setVendors(current => current.filter(item => item.id !== account.id));
      setNotice('Account permanently deleted.');
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Account could not be deleted.'); }
  }

  async function deleteVendor(vendor: Vendor) {
    if (!window.confirm(`Permanently delete ${vendor.businessName} (${vendor.name})? This cannot be undone.`)) return;
    try {
      await api(`/api/superadmin/users/${encodeURIComponent(vendor.id)}`, { method: 'DELETE', body: JSON.stringify({ accountType: 'vendor' }) });
      setVendors(current => current.filter(item => item.id !== vendor.id));
      setAccounts(current => current.filter(item => item.id !== vendor.id));
      setNotice('Vendor permanently deleted.');
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Vendor could not be deleted.'); }
  }

  async function setVendorStatus(vendor: Vendor) {
    const status = vendor.status === 'active' ? 'suspended' : 'active';
    try { 
      await api(`/api/admin/vendors/${encodeURIComponent(vendor.id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); 
      setVendors(current => current.map(item => item.id === vendor.id ? { ...item, status } : item));
      setAccounts(current => current.map(item => item.id === vendor.id ? { ...item, status } : item));
      setNotice(`Vendor ${status === 'active' ? 'reactivated' : 'suspended'}.`);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Vendor could not be updated.'); }
  }

  function openPasswordReset(account: { id: string; name: string; email: string; accountType: 'admin' | 'vendor' }) {
    setPasswordResetTarget(account);
    const gen = generateFriendlyPassword();
    setResetModalPassword(gen);
    setShowResetPassword(true);
    setError('');
  }

  async function resetVendorPassword(vendor: Vendor) {
    openPasswordReset({ id: vendor.id, name: vendor.businessName || vendor.name, email: vendor.email, accountType: 'vendor' });
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
    openPasswordReset({ id: account.id, name: account.name, email: account.email, accountType: account.accountType });
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

  const filteredAccounts = useMemo(() => accounts.filter(account => {
    if (accountFilter !== 'all' && account.accountType !== accountFilter) return false;
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    return (
      account.name?.toLowerCase().includes(q) ||
      account.email?.toLowerCase().includes(q) ||
      account.businessName?.toLowerCase().includes(q) ||
      account.city?.toLowerCase().includes(q)
    );
  }), [accounts, accountFilter, accountSearch]);

  const navItems: { id: Section; label: string; Icon: typeof LayoutDashboard }[] = expectedRole === 'vendor'
    ? [{ id: 'overview', label: 'Dashboard', Icon: LayoutDashboard }, { id: 'listings', label: 'My listings', Icon: CarFront }, { id: 'inquiries', label: 'Buyer enquiries', Icon: MessageSquareText }, { id: 'wishlists', label: 'Wishlist demand', Icon: Heart }, { id: 'profile', label: 'Business profile', Icon: Store }]
    : [
        { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
        ...(expectedRole === 'superadmin' ? [
          { id: 'accounts' as Section, label: 'Admins & accounts', Icon: Users }
        ] : []),
        { id: 'listings', label: 'Car listings', Icon: CarFront },
        { id: 'auctions' as Section, label: 'Auctions', Icon: Gavel },
        { id: 'cities' as Section, label: 'City listings', Icon: MapPin },
        { id: 'makes' as Section, label: 'Vehicle companies', Icon: Building2 },
        { id: 'loans' as Section, label: 'Car loans', Icon: Landmark },
        { id: 'sell-inquiries' as Section, label: 'Sell enquiries', Icon: CircleDollarSign },
        { id: 'seo' as Section, label: 'SEO & Search Console', Icon: Globe2 },
        { id: 'vendors', label: 'Vendors', Icon: Store },
        { id: 'inquiries', label: 'Buyer enquiries', Icon: MessageSquareText },
        { id: 'history', label: 'User history', Icon: HistoryIcon },
        { id: 'wishlists', label: 'Wishlist demand', Icon: Heart },
        { id: 'submissions', label: 'Website submissions', Icon: FilePlus2 },
        ...(expectedRole === 'superadmin' ? [
          { id: 'inspections' as Section, label: 'Inspection review', Icon: ClipboardCheck },
          { id: 'plans' as Section, label: 'Subscription plans', Icon: CreditCard },
          { id: 'subscriptions' as Section, label: 'Vendor subscriptions', Icon: BadgeCheck },
          { id: 'photos' as Section, label: 'Photos', Icon: ImagePlus }
        ] : [])
      ];

  if (authLoading) return <main className="management-loading"><span className="loading-spinner"/> Opening secure workspace…</main>;
  if (!user) return <main className="management-login-shell"><a className="management-brand" href="/"><span><CarFront size={22}/></span>CARS<span>21</span></a><section className="management-login-card"><div className="management-login-icon">{expectedRole === 'vendor' ? <Building2/> : <ShieldCheck/>}</div><span className="eyebrow">CARS21 · PRIVATE WORKSPACE</span><h1>{expectedRole === 'superadmin' ? 'Superadmin sign in' : expectedRole === 'admin' ? 'Admin sign in' : 'Vendor sign in'}</h1><p>{expectedRole === 'superadmin' ? 'Manage platform access, administrators, vendors and marketplace operations.' : expectedRole === 'admin' ? 'Manage Cars21 inventory, vendors and buyer enquiries.' : 'Access only your dealership listings and buyer enquiries.'}</p><form onSubmit={signIn}>
    {expectedRole === 'superadmin' ? <label className="management-field">Superadmin username<input autoComplete="username" required value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="superadmin"/> </label> : <label className="management-field">Work email<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder={expectedRole === 'vendor' ? 'you@dealership.in' : 'you@cars21.in'}/></label>}
    <label className="management-field">Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder={expectedRole === 'superadmin' ? 'Environment configured password' : 'Your account password'}/></label>
    {error && <p className="management-error" role="alert">{error}</p>}<button className="management-primary" type="submit" disabled={dataLoading}>{dataLoading ? 'Signing in…' : 'Continue securely'} <ArrowDownToLine size={17}/></button></form><div className="management-login-foot"><a href={expectedRole === 'vendor' ? '/admin' : '/vendor'}>Switch to {expectedRole === 'vendor' ? 'admin' : 'vendor'} sign in <ArrowLeft size={14}/></a><a href="/">Back to Cars21 <Eye size={14}/></a></div><p className="management-security"><ShieldCheck size={14}/> Secure, role-limited access. Credentials are never stored in the browser.</p></section></main>;

  const heading = navItems.find(item => item.id === section)?.label || 'Workspace';
  const counts = expectedRole !== 'vendor' ? [{ label: 'All listings', value: metrics.totalCars ?? cars.length, Icon: CarFront, tone: 'blue', note: 'Across the marketplace' }, { label: 'Live inventory', value: metrics.activeCars ?? 0, Icon: BadgeCheck, tone: 'green', note: 'Visible to shoppers' }, { label: 'Pending review', value: metrics.pendingCars ?? 0, Icon: ClipboardList, tone: 'amber', note: 'Needs your approval' }, { label: 'Active vendors', value: metrics.activeVendors ?? 0, Icon: Store, tone: 'violet', note: `${metrics.totalVendors ?? 0} registered partners` }] : [{ label: 'My listings', value: cars.length, Icon: CarFront, tone: 'blue', note: 'Across your workspace' }, { label: 'Live', value: metrics.activeCars ?? 0, Icon: BadgeCheck, tone: 'green', note: 'Visible to shoppers' }, { label: 'In review', value: metrics.pendingCars ?? 0, Icon: ClipboardList, tone: 'amber', note: 'Awaiting Cars21' }, { label: 'New enquiries', value: metrics.newInquiries ?? 0, Icon: MessageSquareText, tone: 'violet', note: 'Buyer follow-ups' }];

  return <main className="management-shell">
    <aside className={`management-sidebar${mobileNavOpen ? ' is-open' : ''}`}><div className="management-sidebar-header"><a className="management-brand" href="/"><span><CarFront size={22}/></span>CARS<span>21</span></a><button type="button" className="management-sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18}/></button></div><div className="management-workspace-label">{expectedRole === 'superadmin' ? 'SUPERADMIN CONSOLE' : expectedRole === 'admin' ? 'OPERATIONS CONSOLE' : 'VENDOR WORKSPACE'}</div><nav aria-label="Workspace navigation">{navItems.map(({ id, label, Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => { setSection(id); setMobileNavOpen(false); }}><Icon size={18}/>{label}{id === 'inquiries' && metrics.newInquiries ? <b>{metrics.newInquiries}</b> : null}</button>)}</nav><div className="management-sidebar-bottom"><div className="management-help-card"><ShieldCheck size={17}/><b>{expectedRole === 'vendor' ? 'Your workspace' : expectedRole === 'superadmin' ? 'Platform access' : 'Control at a glance'}</b><span>{expectedRole === 'vendor' ? 'Only your account’s listings and leads are shown.' : expectedRole === 'superadmin' ? 'Manage admin and vendor access from one place.' : 'Review vehicle status before it appears on Cars21.'}</span></div><a href="/" className="management-back-link"><ArrowLeft size={15}/> View marketplace</a></div></aside>
    {mobileNavOpen && <button className="management-nav-scrim" aria-label="Close workspace navigation" onClick={() => setMobileNavOpen(false)}/>}
    <div className="management-main"><header className="management-topbar"><button className="management-menu-toggle" aria-label="Open workspace navigation" onClick={() => setMobileNavOpen(open => !open)}><Menu size={20}/></button><div><span className="management-breadcrumb">{expectedRole === 'superadmin' ? 'Superadmin' : expectedRole === 'admin' ? 'Admin' : 'Vendor'} workspace</span><h1>{heading}</h1></div><div className="management-top-actions">{expectedRole === 'vendor' && vendorProfileUrl && <a className="management-refresh" href={vendorProfileUrl} target="_blank" rel="noreferrer"><Eye size={16}/><span>Public profile</span></a>}<button className="management-refresh" onClick={() => refresh()} aria-label="Refresh workspace"><Gauge size={17}/><span>Refresh</span></button><div className="management-user"><span className="management-avatar"><UserRound size={17}/></span><span><b>{user.name}</b><small>{expectedRole === 'superadmin' ? 'Superadmin' : expectedRole === 'admin' ? 'Administrator' : user.email}</small></span></div><button className="management-logout" onClick={signOut} aria-label="Sign out"><LogOut size={17}/></button></div></header>
      <section className="management-content">
        {error && <div className="management-banner error" role="alert"><X size={17}/>{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
        {notice && <div className="management-banner success" role="status"><Check size={17}/>{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15}/></button></div>}
        {newVendorPassword && <div className="vendor-password-banner"><div><b>One-time account password</b><span>Share it securely now. It won’t be shown again.</span><code>{newVendorPassword}</code></div><button onClick={() => { void navigator.clipboard?.writeText(newVendorPassword); setNotice('Password copied.'); }}>Copy password</button><button aria-label="Dismiss password" onClick={() => setNewVendorPassword('')}><X size={16}/></button></div>}
        {section === 'overview' && expectedRole === 'vendor' && <VendorDashboardOverview profile={vendorProfile} cars={cars} inquiries={inquiries} onNavigate={setSection} onAddCar={() => { setSection('listings'); setCarEditor('new'); }}/>}
        {section === 'overview' && expectedRole !== 'vendor' && <>
          <div className="management-welcome"><div><span className="eyebrow">{expectedRole === 'superadmin' ? 'CARS21 PLATFORM ADMINISTRATION' : 'CARS21 OPERATIONS'}</span><h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}.</h2><p>{expectedRole === 'superadmin' ? 'Manage platform users alongside marketplace operations.' : 'Your marketplace at a glance. Review pending listings and new buyer enquiries first.'}</p></div><div className="management-live"><i/> Workspace connected</div></div>
          <div className="management-metric-grid">{counts.map(({ label, value, Icon, tone, note }) => <article className="management-metric" key={label}><span className={`management-metric-icon ${tone}`}><Icon size={18}/></span><span>{label}</span><b>{dataLoading ? '—' : value.toLocaleString('en-IN')}</b><small>{note}</small></article>)}</div>
          <div className="management-dashboard-grid">
            <article className="management-dashboard-card"><div className="management-dashboard-card-heading"><div><span className="eyebrow">BUYER ACTIVITY</span><h3>Enquiries this week</h3></div><span className="management-dashboard-total"><b>{metrics.totalInquiries ?? inquiries.length}</b><small>{metrics.newInquiries ?? 0} new</small></span></div><div className="management-activity-chart" role="img" aria-label="Buyer enquiries received over the last seven days">{dashboard.activity.map(day => { const peak = Math.max(1, ...dashboard.activity.map(item => item.count)); return <div className="management-activity-day" key={day.date}><span>{day.count}</span><div><i style={{ height: `${Math.max(6, day.count / peak * 100)}%` }}/></div><small>{day.label}</small></div>})}</div><div className="management-dashboard-foot"><Activity size={14}/> Updates automatically every 15 seconds <span>{dashboard.updatedAt ? `· Updated ${new Date(dashboard.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div></article>
            <article className="management-dashboard-card"><div className="management-dashboard-card-heading"><div><span className="eyebrow">PARTNER NETWORK</span><h3>Recently added vendors</h3></div><button className="management-inline-link" onClick={() => setSection('vendors')}>All vendors <ArrowUpRight size={14}/></button></div><div className="management-recent-vendors">{dashboard.recentVendors.slice(0, 4).map(vendor => <div className="management-recent-vendor" key={vendor.id}><span><Building2 size={16}/></span><div><b>{vendor.businessName}</b><small>{vendor.city} · {vendor.name}</small></div><StatusPill value={vendor.status}/></div>)}{dashboard.recentVendors.length === 0 && <div className="management-vendor-empty"><Store size={18}/>Vendor accounts will appear here when created.</div>}</div>{expectedRole === 'superadmin' ? <button className="management-dashboard-cta" onClick={() => { setSection('accounts'); setEditingAccount(null); setNewAccountType('vendor'); setModalError(''); setVendorEditor(true); }}>Add a vendor <ArrowUpRight size={15}/></button> : <button className="management-dashboard-cta" onClick={() => setSection('vendors')}>Review vendor accounts <ArrowUpRight size={15}/></button>}</article>
          </div>
          <div className="management-section-heading"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>Recent buyer enquiries</h2></div><button onClick={() => setSection('inquiries')}>View all enquiries <ArrowLeft size={15}/></button></div>
          <InquiryList inquiries={inquiries.slice(0, 4)} onStatus={updateInquiry} onDelete={expectedRole === 'superadmin' ? deleteInquiry : undefined} />
          <div className="management-shortcuts"><button onClick={() => { setSection('listings'); setCarEditor('new'); }}><Plus size={18}/><span><b>Add a vehicle</b><small>Create a listing or review vendor submissions</small></span><ArrowLeft size={16}/></button>{expectedRole === 'superadmin' && <button onClick={() => { setSection('accounts'); setEditingAccount(null); setNewAccountType('admin'); setModalError(''); setFormPassword(''); setShowPassword(false); setVendorEditor(true); }}><Users size={18}/><span><b>Create an account</b><small>Add an administrator or vendor</small></span><ArrowLeft size={16}/></button>}</div>
        </>}
        {section === 'listings' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">{expectedRole === 'vendor' ? 'YOUR INVENTORY' : 'MARKETPLACE INVENTORY'}</span><h2>{expectedRole === 'vendor' ? 'Manage your listings' : 'Vehicle listings'}</h2><p>{expectedRole === 'vendor' ? 'Listings stay visible for enquiries while their inspection packets are reviewed.' : 'Create, edit, publish or remove vehicles across Cars21.'}</p></div><button type="button" className="management-primary compact" onClick={() => setCarEditor('new')}><Plus size={17}/> Add vehicle</button></div><div className="management-toolbar management-listing-filters"><label className="management-search"><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search make, model, city…" aria-label="Search vehicle listings"/></label>{expectedRole !== 'vendor' && <label className="management-filter">Dealer<select value={listingVendor} onChange={event => setListingVendor(event.target.value)}><option value="all">All dealers</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.businessName}</option>)}</select></label>}<label className="management-filter">Status<select value={listingStatus} onChange={event => setListingStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Live</option><option value="pending">Needs review</option><option value="paused">Paused</option><option value="sold">Sold</option></select></label><span>{filteredCars.length} {filteredCars.length === 1 ? 'listing' : 'listings'}</span></div><div className="management-listings">{filteredCars.map(car => <article className="management-car-row" key={car.id}><div className="management-car-image clickable" onClick={() => setReviewingCar(car)} title="Click to view vehicle details and documents">{car.image ? <img src={car.image} alt={`${car.year} ${car.make} ${car.model}`}/> : <CarFront size={22}/>}</div><div className="management-car-name clickable" onClick={() => setReviewingCar(car)} title="Click to view vehicle details and documents"><b>{car.year} {car.make} {car.model}</b><span>{car.variant || 'Standard'} · {car.city}</span><small>{car.vendorName || (car.vendorId ? 'Dealer listing' : car.sellerUserId ? `Private seller · ${car.sellerName || 'Verified seller'}` : 'Cars21 direct')} · {car.id}</small></div><strong className="management-price">{formatINR(car.price)}</strong><div><StatusPill value={car.status || 'active'}/>{car.vendorId&&car.inspectionReviewStatus&&<small className="inspection-listing-status">Inspection · {car.inspectionReviewStatus.replace('_',' ')}</small>}<div className="management-car-verify-wrap"><span className={`car-verify-badge ${car.verificationStatus || (car.documentPhotoId ? 'under_verification' : 'unverified')}`}>{car.verificationStatus === 'verified' ? '✓ Verified RC' : car.verificationStatus === 'under_verification' ? '⏳ Under verification' : car.verificationStatus === 'rejected' ? '✕ RC Rejected' : '○ Unverified'}</span>{car.documentPhotoId && <a href={`/api/photos/${encodeURIComponent(car.documentPhotoId)}`} target="_blank" rel="noreferrer" className="management-doc-link" title="Open RC Document"><FileText size={12}/> View RC</a>}</div></div><div className="management-row-actions"><button type="button" className="management-view-car-btn" onClick={() => setReviewingCar(car)} title="View vehicle details, RC documents and inspection proof"><Eye size={14}/> View car</button><a href={`/car/${encodeURIComponent(car.id)}`} target="_blank" rel="noreferrer" className="management-public-link" title="Open live public marketplace page in new tab" aria-label="Open public listing"><ExternalLink size={14}/></a>{expectedRole !== 'vendor' && (<>{car.verificationStatus !== 'verified' && <button type="button" className="quick-verify-btn approve" title="Approve vehicle registration document" onClick={() => void verifyCarDoc(car, 'verified')}>Approve RC</button>}{car.verificationStatus === 'verified' && <button type="button" className="quick-verify-btn reject" title="Reject vehicle registration document" onClick={() => void verifyCarDoc(car, 'rejected')}>Revoke RC</button>}</>)}{car.vendorSlug && <a href={`/dealers/${car.vendorSlug}`} target="_blank" rel="noreferrer" aria-label={`View ${car.vendorName || 'dealer'} profile`}><Store size={15}/></a>}<button aria-label={`Edit ${car.make} ${car.model}`} onClick={() => setCarEditor(car)} title="Edit listing"><Pencil size={15}/></button><button className="danger" aria-label={`Remove ${car.make} ${car.model}`} onClick={() => void removeCar(car)} title="Remove listing"><Trash2 size={15}/></button></div></article>)}{filteredCars.length === 0 && <div className="management-empty"><CarFront size={25}/><b>{dataLoading ? 'Loading inventory…' : 'No listings found'}</b><span>{search || listingStatus !== 'all' || listingVendor !== 'all' ? 'Try changing your search or filters.' : 'Add your first vehicle to get started.'}</span><button type="button" className="management-primary compact" style={{ marginTop: '12px' }} onClick={() => setCarEditor('new')}><Plus size={16}/> Add vehicle</button></div>}</div></>}
        {section === 'auctions' && expectedRole !== 'vendor' && <AuctionManager role={expectedRole}/>}
        {section === 'cities' && expectedRole !== 'vendor' && <CityManager/>}
        {section === 'makes' && expectedRole !== 'vendor' && <VehicleCompanyManager/>}
        {section === 'loans' && expectedRole !== 'vendor' && <LoanManager role={expectedRole}/>}
        {section === 'sell-inquiries' && expectedRole !== 'vendor' && <SellInquiryManager role={expectedRole}/>}
        {section === 'seo' && expectedRole !== 'vendor' && <IndexingManager role={expectedRole}/>}
        {section === 'vendors' && expectedRole !== 'vendor' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">PARTNER ACCOUNTS</span><h2>Vendors</h2><p>{expectedRole === 'superadmin' ? 'Review dealership accounts and their marketplace access.' : 'Review dealership access and marketplace activity.'}</p></div>{(expectedRole === 'superadmin' || expectedRole === 'admin') && <button className="management-primary compact" onClick={() => { setEditingAccount(null); setNewAccountType('vendor'); setModalError(''); setFormPassword(''); setShowPassword(false); setVendorEditor(true); }}><Plus size={17}/> Create vendor</button>}</div>{expectedRole === 'superadmin' && <div className="management-vendor-tip"><span><ShieldCheck size={16}/> Looking for platform administrators?</span><button type="button" onClick={() => { setSection('accounts'); setAccountFilter('admin'); }}>View administrators ({accounts.filter(a => a.accountType === 'admin').length}) <ArrowUpRight size={14}/></button></div>}<div className="management-vendor-grid">{vendors.map(vendor => <article className="management-vendor-card" key={vendor.id}><div className="management-vendor-top"><span className="management-vendor-icon"><Building2 size={20}/></span><StatusPill value={vendor.status}/></div><h3>{vendor.businessName}</h3><p className="management-vendor-person">{vendor.name}</p><a href={`mailto:${vendor.email}`}><Mail size={14}/>{vendor.email}</a><span><MapPin size={14}/>{vendor.city} · {vendor.phone}</span>{vendor.addedBy && <div className="management-added-by-badge"><UserCheck size={13}/> Added by: <b>{vendor.addedBy.name}</b> ({vendor.addedBy.role})</div>}{expectedRole === 'superadmin' ? <div className="management-vendor-assign"><label><UserCheck size={12}/><span>Admin:</span><select value={vendor.assignedAdminId || ''} onChange={event => void assignVendorToAdmin(vendor, event.target.value)} disabled={dataLoading} title="Assign this vendor to an administrator"><option value="">(Unassigned / Superadmin only)</option>{accounts.filter(a => a.accountType === 'admin' && a.status === 'active').map(admin => <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>)}</select></label></div> : vendor.assignedAdminName ? <div className="management-assigned-admin-badge">Assigned to: {vendor.assignedAdminName}</div> : null}{vendor.profileUrl && <a href={vendor.profileUrl} target="_blank" rel="noreferrer"><Eye size={14}/>Open public dealer page</a>}<button type="button" className="reset" title="Request Google Search Console indexing for this dealer page" onClick={() => void requestDealerIndexing(vendor)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#2563eb' }}><Globe2 size={13}/> Google Index</button><div className="management-vendor-bottom"><small>Added {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('en-IN') : 'recently'}</small><div>{expectedRole === 'superadmin' && <button className="reset" onClick={() => { const account = accounts.find(item => item.accountType === 'vendor' && item.id === vendor.id) || { id: vendor.id, accountType: 'vendor' as const, name: vendor.name, email: vendor.email, businessName: vendor.businessName, phone: vendor.phone, city: vendor.city, status: vendor.status, profileUrl: vendor.profileUrl }; setEditingAccount(account); setModalError(''); setFormPassword(''); setShowPassword(false); setVendorEditor(true); }}>Edit profile</button>}{expectedRole === 'superadmin' && <button className="reset" onClick={() => openPasswordReset({ id: vendor.id, name: vendor.businessName || vendor.name, email: vendor.email, accountType: 'vendor' })}>Reset password</button>}{expectedRole === 'admin' && <button className="reset" onClick={() => openPasswordReset({ id: vendor.id, name: vendor.businessName || vendor.name, email: vendor.email, accountType: 'vendor' })}>Reset password</button>}<button className={vendor.status === 'active' ? 'suspend' : 'activate'} onClick={() => void setVendorStatus(vendor)}>{vendor.status === 'active' ? 'Suspend' : 'Reactivate'}</button>{expectedRole === 'superadmin' && <button className="suspend" onClick={() => void deleteVendor(vendor)}>Delete</button>}</div></div></article>)}{vendors.length === 0 && <div className="management-empty"><Store size={25}/><b>No vendors yet</b><span>{expectedRole === 'superadmin' ? 'Create a vendor account from here or the Access & accounts page.' : 'Vendor accounts will appear here when created.'}</span></div>}</div></>}
        {section === 'photos' && expectedRole === 'superadmin' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">GRIDFS MEDIA</span><h2>Photos and showroom images</h2><p>Review listing and vendor profile photos. Removing an attached photo also clears its profile or listing reference.</p></div><div className="management-inquiry-total"><b>{photos.length}</b><span>Recent photos</span></div></div><div className="management-vendor-grid">{photos.map(photo => <article className="management-vendor-card management-photo-card" key={photo.id}><a className="management-photo-preview" href={`/api/photos/${encodeURIComponent(photo.id)}`} target="_blank" rel="noreferrer"><img src={`/api/photos/${encodeURIComponent(photo.id)}`} alt={photo.filename}/></a><h3 title={photo.filename}>{photo.filename}</h3><p className="management-vendor-person">{photo.contentType} · {Math.max(1, Math.round(photo.length / 1024))} KB</p>{photo.usedBy ? <a href={photo.usedBy.href} target="_blank" rel="noreferrer">{photo.usedBy.kind === 'vendor' ? <Store size={14}/> : <CarFront size={14}/>} {photo.usedBy.label}</a> : <span><ImagePlus size={14}/>Not attached to a listing or profile</span>}<div className="management-vendor-bottom"><small>{new Date(photo.uploadDate).toLocaleDateString('en-IN')}</small><div><button className="suspend" onClick={() => void deletePhoto(photo)}>Delete photo</button></div></div></article>)}{photos.length === 0 && <div className="management-empty"><ImagePlus size={25}/><b>No stored photos</b><span>Uploaded listing and showroom images will appear here.</span></div>}</div></>}
        {section === 'accounts' && expectedRole === 'superadmin' && <><div className="management-section-heading management-list-heading"><div><span className="eyebrow">PLATFORM ACCESS</span><h2>Admins and vendors</h2><p>Create, edit, suspend, reset or remove platform accounts.</p></div><div className="management-heading-actions"><button className="management-primary compact" onClick={() => { setEditingAccount(null); setNewAccountType('admin'); setModalError(''); setFormPassword(''); setShowPassword(false); setVendorEditor(true); }}><Plus size={17}/> Create admin</button><button className="management-secondary compact" onClick={() => { setEditingAccount(null); setNewAccountType('vendor'); setModalError(''); setFormPassword(''); setShowPassword(false); setVendorEditor(true); }}><Plus size={17}/> Create vendor</button></div></div><div className="management-account-tabs-wrap"><div className="management-account-tabs"><button className={accountFilter === 'all' ? 'active' : ''} onClick={() => setAccountFilter('all')}>All accounts <b>{accounts.length}</b></button><button className={accountFilter === 'admin' ? 'active' : ''} onClick={() => setAccountFilter('admin')}><ShieldCheck size={14}/> Administrators <b>{accounts.filter(a => a.accountType === 'admin').length}</b></button><button className={accountFilter === 'vendor' ? 'active' : ''} onClick={() => setAccountFilter('vendor')}><Building2 size={14}/> Vendors <b>{accounts.filter(a => a.accountType === 'vendor').length}</b></button></div></div><div className="management-toolbar"><label className="management-search"><Search size={17}/><input value={accountSearch} onChange={event => setAccountSearch(event.target.value)} placeholder="Search name or email…" aria-label="Search accounts"/></label><span>{filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}</span></div><div className="management-vendor-grid">{filteredAccounts.map(account => <article className={`management-vendor-card${account.accountType === 'admin' ? ' management-admin-card' : ''}`} key={`${account.accountType}-${account.id}`}><div className="management-vendor-top"><span className={`management-vendor-icon${account.accountType === 'admin' ? ' is-admin' : ''}`}>{account.accountType === 'admin' ? <ShieldCheck size={20}/> : <Building2 size={20}/>}</span><span className={`account-role-pill ${account.accountType}`}>{account.accountType === 'admin' ? 'Administrator' : 'Vendor'}</span><StatusPill value={account.status}/></div><h3>{account.accountType === 'admin' ? account.name : account.businessName}</h3><p className="management-vendor-person">{account.accountType === 'admin' ? 'Platform administrator' : account.name}</p><a href={`mailto:${account.email}`}><Mail size={14}/>{account.email}</a>{account.accountType === 'vendor' && <><span><MapPin size={14}/>{account.city} · {account.phone}</span>{account.profileUrl && <a href={account.profileUrl} target="_blank" rel="noreferrer"><Eye size={14}/>Open public dealer page</a>}</>}<div className="management-vendor-bottom"><small>{account.accountType === 'admin' ? 'Admin operations access' : 'Vendor workspace'}</small><div><button className="reset" onClick={() => { setEditingAccount(account); setModalError(''); setFormPassword(''); setShowPassword(false); setVendorEditor(true); }}>Edit details</button><button className="reset" onClick={() => openPasswordReset({ id: account.id, name: account.name, email: account.email, accountType: account.accountType })}>Reset password</button><button className={account.status === 'active' ? 'suspend' : 'activate'} onClick={() => void updateAccount(account)}>{account.status === 'active' ? 'Suspend' : 'Reactivate'}</button><button className="suspend" onClick={() => void deleteAccount(account)}>Delete</button></div></div></article>)}{filteredAccounts.length === 0 && <div className="management-empty"><Users size={25}/><b>No accounts found</b><span>{accountSearch ? 'No accounts match your search filter.' : 'Create your first administrator or vendor account.'}</span></div>}</div></>}
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
    {carEditor && <CarEditor car={carEditor === 'new' ? null : carEditor} role={expectedRole === 'vendor' ? 'vendor' : 'admin'} vendors={vendors.filter(vendor => vendor.status === 'active')} makes={makes} cities={cities} imageLimit={vendorProfile?.subscription?.plan?.maxImagesPerListing || 20} saving={dataLoading} onClose={() => setCarEditor(null)} onSubmit={saveCar}/>}
    {vendorEditor && (expectedRole === 'superadmin' || expectedRole === 'admin') && <Modal title={editingAccount ? `Edit ${editingAccount.accountType} account` : `Create ${newAccountType} account`} onClose={() => { setVendorEditor(false); setEditingAccount(null); setModalError(''); setFormPassword(''); setShowPassword(false); }}>
      {editingAccount?.accountType === 'vendor' ? <VendorProfileEditor key={editingAccount.id} initial={{ id: editingAccount.id, name: editingAccount.name, businessName: editingAccount.businessName || '', email: editingAccount.email, inquiryEmail: editingAccount.inquiryEmail || editingAccount.email, inquiryWhatsApp: editingAccount.inquiryWhatsApp || editingAccount.phone || '', phone: editingAccount.phone || '', city: editingAccount.city || '', area: editingAccount.area || '', address: editingAccount.address || '', description: editingAccount.description || '', website: editingAccount.website || '', workingHours: editingAccount.workingHours || '', establishedYear: editingAccount.establishedYear || null, specialties: editingAccount.specialties || [], logoPhotoId: editingAccount.logoPhotoId || '', coverPhotoId: editingAccount.coverPhotoId || '', shopPhotoIds: editingAccount.shopPhotoIds || [], profileUrl: editingAccount.profileUrl }} endpoint={`/api/superadmin/users/${encodeURIComponent(editingAccount.id)}`} superadmin editableEmail onSaved={(updated, profileUrl) => { const next = { ...editingAccount, ...updated, profileUrl: profileUrl || updated.profileUrl }; setAccounts(current => current.map(account => account.id === next.id ? next : account)); setVendors(current => current.map(vendor => vendor.id === next.id ? { ...vendor, ...next } : vendor)); setVendorEditor(false); setEditingAccount(null); setNotice('Vendor profile updated. The public dealer page now uses these details.'); }}/>
      : <form key={editingAccount?.id || 'new-account'} className="management-form" onSubmit={editingAccount ? saveAccountDetails : addVendor}>
          <p>{editingAccount ? 'Update this account’s profile details.' : newAccountType === 'admin' ? 'Administrators can manage marketplace listings, vendors and buyer enquiries. Only the environment-configured superadmin can create accounts.' : 'Vendors receive access to their own listings and buyer enquiries only.'}</p>
          {modalError && <p className="management-error" style={{ margin: '0 0 12px' }} role="alert">{modalError}</p>}
          <label className="management-field">Account type
            <select name="accountType" value={editingAccount?.accountType || newAccountType} disabled={Boolean(editingAccount)} onChange={event => { setNewAccountType(event.target.value as 'admin' | 'vendor'); setModalError(''); setFormPassword(''); setShowPassword(false); }}>
              <option value="admin">Administrator</option>
              <option value="vendor">Vendor</option>
            </select>
          </label>
          <label className="management-field">{(editingAccount?.accountType || newAccountType) === 'admin' ? 'Full name' : 'Contact name'}
            <input required name="name" autoComplete="name" maxLength={100} defaultValue={editingAccount?.name || ''} placeholder="Alex Sharma"/>
          </label>
          {(editingAccount?.accountType || newAccountType) === 'vendor' && <label className="management-field">Dealership name
            <input required name="businessName" maxLength={120} defaultValue={editingAccount?.businessName || ''} placeholder="Northstar Motors"/>
          </label>}
          <div className="management-form-pair">
            <label className="management-field">Work email
              <input required name="email" type="email" autoComplete="email" maxLength={160} defaultValue={editingAccount?.email || ''} placeholder={(editingAccount?.accountType || newAccountType) === 'admin' ? 'alex@cars21.in' : 'alex@northstar.in'}/>
            </label>
            {(editingAccount?.accountType || newAccountType) === 'vendor' && <label className="management-field">Phone
              <input required name="phone" type="tel" maxLength={24} defaultValue={editingAccount?.phone || ''} placeholder="+91 98765 43210"/>
            </label>}
          </div>
          {(editingAccount?.accountType || newAccountType) === 'vendor' && <label className="management-field">City
            <input required name="city" maxLength={80} defaultValue={editingAccount?.city || 'Junagadh'} placeholder="Junagadh"/>
          </label>}

          {(editingAccount?.accountType || newAccountType) === 'vendor' && expectedRole === 'superadmin' && (
            <label className="management-field">
              Assigned Administrator
              <select name="assignedAdminId" defaultValue={editingAccount?.assignedAdminId || ''}>
                <option value="">No administrator assigned (Superadmin only)</option>
                {accounts.filter(a => a.accountType === 'admin' && a.status === 'active').map(admin => (
                  <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
                ))}
              </select>
              <small>The selected administrator will have exclusive management access to this vendor and their cars.</small>
            </label>
          )}

          {/* Password configuration field */}
          <label className="management-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>{editingAccount ? 'Change password (optional)' : 'Account password'}</span>
              <button
                type="button"
                onClick={() => {
                  const gen = generateFriendlyPassword();
                  setFormPassword(gen);
                  setShowPassword(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <RefreshCw size={12} /> Auto-generate strong
              </button>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formPassword}
                onChange={event => setFormPassword(event.target.value)}
                minLength={6}
                maxLength={100}
                placeholder={editingAccount ? 'Leave blank to keep existing password' : 'Enter custom password (min 6 chars) or leave blank'}
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <small>
              {editingAccount
                ? 'Only fill this if you want to set a new password. Must be at least 6 characters.'
                : 'Enter a custom password for this account, or leave blank to auto-generate a secure random one.'}
            </small>
          </label>

          <div className="management-form-actions">
            <button type="button" className="management-secondary" onClick={() => { setVendorEditor(false); setEditingAccount(null); setModalError(''); setFormPassword(''); }}>Cancel</button>
            <button className="management-primary" disabled={dataLoading}>{dataLoading ? 'Saving…' : editingAccount ? 'Save details' : 'Create account'} <Check size={16}/></button>
          </div>
        </form>}
    </Modal>}

    {/* Dedicated password reset & update modal */}
    {passwordResetTarget && (
      <Modal 
        title={`Set Password · ${passwordResetTarget.name}`} 
        onClose={() => { setPasswordResetTarget(null); setResetModalPassword(''); }}
      >
        <form 
          className="management-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setDataLoading(true);
            setError('');
            try {
              const customPassword = resetModalPassword.trim();
              if (customPassword.length < 6) {
                throw new Error('Password must be at least 6 characters.');
              }
              let result: { initialPassword: string };
              if (expectedRole === 'superadmin') {
                result = await api<{ initialPassword: string }>(`/api/superadmin/users/${encodeURIComponent(passwordResetTarget.id)}`, {
                  method: 'POST',
                  body: JSON.stringify({ accountType: passwordResetTarget.accountType, password: customPassword })
                });
              } else {
                result = await api<{ initialPassword: string }>(`/api/admin/vendors/${encodeURIComponent(passwordResetTarget.id)}`, {
                  method: 'POST',
                  body: JSON.stringify({ password: customPassword })
                });
              }
              setNewVendorPassword(result.initialPassword);
              setPasswordResetTarget(null);
              setResetModalPassword('');
              setNotice(`Password successfully set for ${passwordResetTarget.name}.`);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Password could not be reset.');
            } finally {
              setDataLoading(false);
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: passwordResetTarget.accountType === 'admin' ? '#eff6ff' : '#fdf4ff', color: passwordResetTarget.accountType === 'admin' ? '#2563eb' : '#9333ea', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {passwordResetTarget.accountType === 'admin' ? <ShieldCheck size={18}/> : <Building2 size={18}/>}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 750, color: '#0f172a' }}>{passwordResetTarget.name}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{passwordResetTarget.email} · <span style={{ textTransform: 'capitalize' }}>{passwordResetTarget.accountType}</span></div>
            </div>
          </div>

          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
            Type any new custom password for this account, or use the generated password below. The previous password will immediately stop working.
          </p>

          <label className="management-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>New password</span>
              <button
                type="button"
                onClick={() => {
                  const gen = generateFriendlyPassword();
                  setResetModalPassword(gen);
                  setShowResetPassword(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <RefreshCw size={12} /> Auto-generate strong
              </button>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                required
                type={showResetPassword ? 'text' : 'password'}
                value={resetModalPassword}
                onChange={e => setResetModalPassword(e.target.value)}
                minLength={6}
                maxLength={100}
                placeholder="Enter new password (min 6 chars)"
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(v => !v)}
                aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <small>At least 6 characters.</small>
          </label>

          <div className="management-form-actions">
            <button
              type="button"
              className="management-secondary"
              onClick={() => { setPasswordResetTarget(null); setResetModalPassword(''); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="management-primary"
              disabled={dataLoading || resetModalPassword.trim().length < 6}
            >
              {dataLoading ? 'Saving…' : 'Save new password'} <Check size={16}/>
            </button>
          </div>
        </form>
      </Modal>
    )}
    {reviewingCar && (
      <CarReviewModal
        car={reviewingCar}
        expectedRole={expectedRole}
        verifying={dataLoading}
        onClose={() => setReviewingCar(null)}
        onVerify={verifyCarDoc}
        onEdit={(c) => {
          setReviewingCar(null);
          setCarEditor(c);
        }}
      />
    )}
  </main>;
}

function StatusPill({ value }: { value: string }) { return <span className={`management-status ${value}`}>{statusLabel[value] || value}</span>; }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose]);
  return <div className="management-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="management-modal" role="dialog" aria-modal="true" aria-labelledby="management-modal-title"><header><h2 id="management-modal-title">{title}</h2><button aria-label="Close dialog" onClick={onClose}><X size={19}/></button></header>{children}</section></div>;
}

function CarEditor({
  car,
  role,
  vendors,
  makes,
  cities,
  imageLimit,
  saving,
  onClose,
  onSubmit
}: {
  car: CarRecord | null;
  role: Role;
  vendors: Vendor[];
  makes: MakeItem[];
  cities: CityItem[];
  imageLimit: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const value = car || blankCar;
  const inspection = value.inspection || {};

  const [selectedMake, setSelectedMake] = useState<string>(value.make || (makes[0]?.name || 'Maruti Suzuki'));
  const [modelInput, setModelInput] = useState<string>(value.model || '');
  const [selectedBody, setSelectedBody] = useState<string>(value.body || 'SUV');
  const [selectedYear, setSelectedYear] = useState<number | string>(value.year || 2024);

  // Retrieve 2022-2026 models for currently selected make
  const currentMakeObj = makes.find(m => m.name.toLowerCase() === selectedMake.toLowerCase());
  const companyModels = useMemo(() => {
    return (currentMakeObj?.models || []).filter(m => m.status !== 'inactive');
  }, [currentMakeObj]);

  const handleSelectModel = (name: string) => {
    setModelInput(name);
    const found = companyModels.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (found) {
      if (found.body) {
        const b = found.body;
        const normalized = b.includes('SUV') ? 'SUV' : b.includes('Sedan') ? 'Sedan' : b.includes('Hatchback') ? 'Hatchback' : b.includes('MUV') ? 'MPV' : b.includes('Electric') ? 'Electric' : b.includes('Coupe') ? 'Coupe' : b;
        setSelectedBody(normalized);
      }
      if (found.years && found.years.length > 0) {
        if (!value.year || !found.years.includes(Number(value.year))) {
          setSelectedYear(Math.max(...found.years));
        }
      }
    }
  };

  return (
    <Modal title={car ? `Edit ${car.make} ${car.model}` : 'Add a vehicle'} onClose={onClose}>
      <form className="management-form management-car-form" onSubmit={onSubmit}>
        <div className="management-form-pair">
          <label className="management-field">
            Company / Make
            <select
              required
              name="make"
              value={selectedMake}
              onChange={e => {
                const nextMake = e.target.value;
                setSelectedMake(nextMake);
              }}
            >
              <option value="" disabled>Select vehicle company</option>
              {makes.map(m => (
                <option key={m.id} value={m.name}>
                  {m.name} {m.models?.length ? `(${m.models.length} models)` : ''}
                </option>
              ))}
              {value.make && !makes.some(m => m.name.toLowerCase() === value.make.toLowerCase()) && (
                <option value={value.make}>{value.make}</option>
              )}
            </select>
          </label>
          <label className="management-field">
            Model
            <input
              required
              name="model"
              list="company-models-datalist"
              value={modelInput}
              onChange={e => handleSelectModel(e.target.value)}
              maxLength={80}
              placeholder={companyModels.length ? `e.g. ${companyModels.slice(0, 3).map(m => m.name).join(', ')}` : 'e.g. Nexon EV, Swift, Creta'}
            />
            <datalist id="company-models-datalist">
              {companyModels.map(m => (
                <option key={m.id} value={m.name}>
                  {m.name} — {m.body || 'Car'} ({m.years?.join(', ') || '2022–2026'})
                </option>
              ))}
            </datalist>

            {/* Quick-pick chips for active models (2022-2026) */}
            {companyModels.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', alignSelf: 'center', fontWeight: 600 }}>2022–2026:</span>
                {companyModels.slice(0, 7).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m.name)}
                    style={{
                      border: modelInput.toLowerCase() === m.name.toLowerCase() ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      background: modelInput.toLowerCase() === m.name.toLowerCase() ? '#eff6ff' : '#f8fafc',
                      color: modelInput.toLowerCase() === m.name.toLowerCase() ? '#1d4ed8' : '#334155',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </label>
        </div>

        <div className="management-form-pair">
          <label className="management-field">
            Variant
            <input name="variant" defaultValue={value.variant} maxLength={120} placeholder="e.g. XZ+ Lux, Alpha, ZXi" />
          </label>
          <label className="management-field">
            Model year
            <input
              required
              name="year"
              type="number"
              min="1980"
              max="2100"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
              {[2022, 2023, 2024, 2025, 2026].map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  style={{
                    border: String(selectedYear) === String(yr) ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    background: String(selectedYear) === String(yr) ? '#eff6ff' : '#f8fafc',
                    color: String(selectedYear) === String(yr) ? '#1d4ed8' : '#475569',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="management-form-pair">
          <label className="management-field">
            Price (₹)
            <input required name="price" type="number" min="1" defaultValue={value.price} />
          </label>
          <label className="management-field">
            Kilometres
            <input required name="km" type="number" min="0" defaultValue={value.km} />
          </label>
        </div>

        <div className="management-form-pair">
          <label className="management-field">
            City / Location
            <select required name="city" defaultValue={value.city || (cities[0]?.name || 'Bengaluru')}>
              <option value="" disabled>Select listed city</option>
              {cities.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name}{c.pincode ? ` (${c.pincode})` : ''} - {c.state}
                </option>
              ))}
              {value.city && !cities.some(c => c.name.toLowerCase() === value.city.toLowerCase()) && (
                <option value={value.city}>{value.city}</option>
              )}
            </select>
          </label>
          <label className="management-field">
            Area / locality
            <input name="area" defaultValue={value.area || ''} maxLength={80} placeholder="e.g. Sardarbag, Koramangala" />
          </label>
        </div>

        <label className="management-field">
          Body type
          <select name="body" value={selectedBody} onChange={e => setSelectedBody(e.target.value)}>
            <option value="SUV">SUV</option>
            <option value="Compact SUV">Compact SUV</option>
            <option value="Midsize SUV">Midsize SUV</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Sedan">Sedan</option>
            <option value="MUV">MUV / MPV</option>
            <option value="MPV">MPV</option>
            <option value="Coupe">SUV Coupe / Coupe</option>
            <option value="Electric">Electric SUV / Car</option>
            <option value="Pickup">Pickup</option>
            <option value="Van">Van</option>
          </select>
        </label>

        <div className="management-form-pair">
          <label className="management-field">
            Fuel
            <select name="fuel" defaultValue={value.fuel}>
              <option>Petrol</option>
              <option>Diesel</option>
              <option>Electric</option>
              <option>CNG</option>
              <option>Hybrid</option>
            </select>
          </label>
          <label className="management-field">
            Transmission
            <select name="transmission" defaultValue={value.transmission}>
              <option>Automatic</option>
              <option>Manual</option>
            </select>
          </label>
        </div>

        <div className="management-form-pair">
          <label className="management-field">
            Owners
            <input name="owners" type="number" min="1" max="10" defaultValue={value.owners} />
          </label>
          {role !== 'vendor' && (
            <label className="management-field">
              Inspection score
              <input name="score" type="number" min="0" max="100" defaultValue={value.score} />
            </label>
          )}
        </div>

        <div className="management-form-pair">
          <label className="management-field">
            Colour
            <input name="color" defaultValue={value.color || ''} placeholder="e.g. Pearl White" />
          </label>
          <label className="management-field">
            Listing badge
            <input name="badge" defaultValue={value.badge} maxLength={60} />
          </label>
        </div>

        {/* Vehicle Document & Verification Section */}
        <fieldset className="inspection-packet-fields" style={{ margin: '14px 0', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
          <legend style={{ fontWeight: 700, padding: '0 6px', color: '#1e293b' }}>Vehicle Document & Verification</legend>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b' }}>
            Upload vehicle RC (Registration Certificate) document. If not provided, listing will be marked as <b>Unverified</b>. Providing a document marks it as <b>Under verification</b> until approved.
          </p>
          <div className="management-form-pair">
            <label className="management-field">
              RC / Registration Document
              <input name="documentFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" />
              <small>{value.documentPhotoId ? 'Upload a file to replace existing document.' : 'JPEG, PNG, WebP or PDF · up to 4 MB'}</small>
            </label>
            <label className="management-field">
              RC / Registration Number
              <input name="documentNumber" defaultValue={value.documentNumber || ''} maxLength={40} placeholder="e.g. GJ-11-AB-1234" />
            </label>
          </div>
          <input type="hidden" name="documentPhotoId" value={value.documentPhotoId || ''} />
          {value.documentPhotoId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '13px' }}>
              <span className={`car-verify-badge ${value.verificationStatus || 'under_verification'}`}>
                {value.verificationStatus === 'verified' ? '✓ Verified RC' : value.verificationStatus === 'rejected' ? '✕ RC Rejected' : '⏳ Under verification'}
              </span>
              <a href={`/api/photos/${encodeURIComponent(value.documentPhotoId)}`} target="_blank" rel="noreferrer" className="management-doc-link">
                <FileText size={13} /> View current RC document
              </a>
            </div>
          )}
          {role !== 'vendor' && (
            <div style={{ marginTop: '10px' }}>
              <label className="management-field">
                Verification Status (Review)
                <select name="verificationStatus" defaultValue={value.verificationStatus || (value.documentPhotoId ? 'under_verification' : 'unverified')}>
                  <option value="unverified">Unverified (No doc / pending RC)</option>
                  <option value="under_verification">Under verification (RC uploaded)</option>
                  <option value="verified">Verified (Approved RC)</option>
                  <option value="rejected">Rejected (Invalid RC)</option>
                </select>
              </label>
            </div>
          )}
        </fieldset>

        <div className="management-form-pair">
          <label className="management-field">
            Seller name
            <input name="sellerName" defaultValue={value.sellerName || ''} />
          </label>
          <label className="management-field">
            Seller phone
            <input name="sellerPhone" type="tel" defaultValue={value.sellerPhone || ''} />
          </label>
        </div>
        <label className="management-field">
          Seller WhatsApp
          <input name="sellerWhatsApp" type="tel" defaultValue={value.sellerWhatsApp || ''} />
        </label>

        <label className="management-field">
          Listing photos
          <input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple />
          <small>{role === 'vendor' ? imageLimit ? `Up to ${imageLimit} photos total per vehicle, including inspection evidence.` : 'An active subscription is needed to upload listing photos.' : 'JPEG, PNG, WebP or AVIF · up to 4 MB each'}</small>
        </label>
        {(value.photoIds?.length || value.imageId) && (
          <div className="management-car-photo-previews">
            {(value.photoIds?.length ? value.photoIds : value.imageId ? [value.imageId] : []).slice(0, 20).map((id, index) => (
              <img key={`${id}-${index}`} src={`/api/photos/${encodeURIComponent(id)}`} alt={`Current listing photo ${index + 1}`} />
            ))}
          </div>
        )}
        <label className="management-field">
          Or image URL
          <input name="image" type="url" defaultValue={value.image || ''} placeholder="https://…" />
        </label>
        <input type="hidden" name="imageId" value={value.imageId || ''} />
        <input type="hidden" name="photoIds" value={JSON.stringify(value.photoIds || (value.imageId ? [value.imageId] : []))} />

        {role === 'vendor' && (
          <fieldset className="inspection-packet-fields">
            <legend>Inspection details for Cars21 review</legend>
            <p>Fill what you can verify and attach clear photos. Your vehicle can receive enquiries while the report is being reviewed.</p>
            {[
              ['inspectionExterior', 'Exterior body & paint', 'Scratches, dents, repaint, glass'],
              ['inspectionInterior', 'Interior & upholstery', 'Seats, odometer, controls'],
              ['inspectionEngine', 'Engine & transmission', 'Leaks, warning lights, gears'],
              ['inspectionTyres', 'Tyres & brakes', 'Tread, age, brake feel'],
              ['inspectionElectronics', 'Electrical & safety', 'Lights, AC, airbags, sensors'],
              ['inspectionDocuments', 'Documents', 'RC, insurance, service history'],
              ['inspectionRoadTest', 'Road test', 'Noise, steering, braking, ride'],
              ['inspectionAccidentHistory', 'Accident / repair history', 'Disclose known repairs and claims']
            ].map(([name, label, placeholder]) => (
              <label className="management-field" key={name}>
                {label}
                <textarea name={name} rows={2} maxLength={500} defaultValue={String(inspection[name] || '')} placeholder={placeholder} />
              </label>
            ))}
            <label className="management-field">
              Additional notes
              <textarea name="inspectionNotes" rows={3} maxLength={2000} defaultValue={String(inspection.notes || '')} placeholder="Anything else the reviewer should know." />
            </label>
            <label className="management-field">
              Inspection evidence photos
              <input name="evidencePhotos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple />
              <small>Evidence photos count toward your plan’s per-listing photo limit.</small>
            </label>
            <input type="hidden" name="evidencePhotoIds" value={JSON.stringify(Array.isArray(inspection.evidencePhotoIds) ? inspection.evidencePhotoIds : [])} />
            {Array.isArray(inspection.evidencePhotoIds) && inspection.evidencePhotoIds.length > 0 && (
              <div className="management-car-photo-previews">
                {inspection.evidencePhotoIds.map((id, index) => (
                  <img key={`${id}-${index}`} src={`/api/photos/${encodeURIComponent(id)}`} alt={`Current inspection evidence ${index + 1}`} />
                ))}
              </div>
            )}
          </fieldset>
        )}

        {role === 'admin' && (
          <div className="management-form-pair">
            <label className="management-field">
              Vendor
              <select name="vendorId" defaultValue={value.vendorId || ''}>
                <option value="">Cars21 direct listing</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.businessName}</option>
                ))}
              </select>
            </label>
            <label className="management-field">
              Visibility
              <select name="status" defaultValue={value.status || 'active'}>
                <option value="active">Live</option>
                <option value="pending">Needs review</option>
                <option value="paused">Paused</option>
                <option value="sold">Sold</option>
              </select>
            </label>
          </div>
        )}

        {role === 'vendor' && (
          <div className="management-review-note">
            <ShieldCheck size={16} /> Inspection and document are reviewed by Cars21; your listing will stay visible for enquiries while the review is pending.
          </div>
        )}

        <div className="management-form-actions">
          <button type="button" className="management-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="management-primary" disabled={saving}>
            {saving ? 'Saving…' : car ? 'Save changes' : role === 'vendor' ? 'Publish listing & submit documents' : 'Create listing'} <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function InquiryList({ inquiries, onStatus, onDelete }: { inquiries: Inquiry[]; onStatus: (inquiry: Inquiry, status: string) => void; onDelete?: (inquiry: Inquiry) => void }) {
  if (!inquiries.length) return <div className="management-empty"><MessageSquareText size={25}/><b>No enquiries yet</b><span>Buyer requests will appear here when they ask about a vehicle.</span></div>;
  return <div className="management-inquiry-list">{inquiries.map(inquiry => <article className="management-inquiry-card" key={inquiry.id}><div className="management-inquiry-heading"><div><StatusPill value={inquiry.status}/><time>{new Date(inquiry.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time></div><a href={`/car/${encodeURIComponent(inquiry.carId || '')}`} target="_blank" rel="noreferrer">View car <Eye size={14}/></a></div><div className="management-inquiry-columns"><div><span className="eyebrow">VEHICLE</span><h3>{inquiry.vehicle.year} {inquiry.vehicle.make} {inquiry.vehicle.model}</h3><p>{inquiry.vehicle.variant} · {inquiry.vehicle.city}</p><b>{formatINR(inquiry.vehicle.price)}</b></div><div><span className="eyebrow">BUYER</span><h3>{inquiry.client.name}</h3><a href={`tel:${inquiry.client.phone}`}>{inquiry.client.phone}</a>{inquiry.client.email && <a href={`mailto:${inquiry.client.email}`}>{inquiry.client.email}</a>}<p>{inquiry.client.city}{inquiry.client.preferredDate ? ` · ${inquiry.client.preferredDate}` : ''}{inquiry.client.preferredTime ? ` · ${inquiry.client.preferredTime}` : ''}</p></div>{inquiry.client.message && <div className="management-inquiry-message"><span className="eyebrow">MESSAGE</span><p>{inquiry.client.message}</p></div>}</div><div className="inquiry-notification-state">Dealer email: {inquiry.notifications?.email?.status==='sent'?'Sent':inquiry.notifications?.email?.status==='failed'?'Delivery failed':'Mail provider not configured'}{inquiry.notifications?.email?.to?` · ${inquiry.notifications.email.to}`:''}</div><div className="management-inquiry-actions"><label>Update status<select value={inquiry.status} onChange={event => onStatus(inquiry, event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="visit_booked">Visit booked</option><option value="closed">Closed</option></select></label>{onDelete && <button className="management-secondary" onClick={() => onDelete(inquiry)}><Trash2 size={15}/> Delete enquiry</button>}</div></article>)}</div>;
}

function CarReviewModal({
  car,
  expectedRole,
  verifying,
  onClose,
  onVerify,
  onEdit
}: {
  car: CarRecord;
  expectedRole: Role;
  verifying: boolean;
  onClose: () => void;
  onVerify: (car: CarRecord, status: 'verified' | 'rejected' | 'under_verification' | 'unverified', note?: string) => Promise<void>;
  onEdit: (car: CarRecord) => void;
}) {
  const [reviewNote, setReviewNote] = useState(car.verificationNote || '');
  const [actionSuccess, setActionSuccess] = useState('');

  const allPhotos = useMemo(() => {
    const list: { id?: string; url: string; label: string }[] = [];
    if (car.image) list.push({ url: car.image, label: 'Hero Image' });
    if (car.imageId && !list.some(p => p.url.includes(car.imageId!))) {
      list.push({ id: car.imageId, url: `/api/photos/${encodeURIComponent(car.imageId)}`, label: 'Primary Photo' });
    }
    if (Array.isArray(car.photoIds)) {
      car.photoIds.forEach((pid, idx) => {
        const url = `/api/photos/${encodeURIComponent(pid)}`;
        if (!list.some(p => p.url === url)) {
          list.push({ id: pid, url, label: `Photo ${idx + 1}` });
        }
      });
    }
    return list;
  }, [car]);

  const evidencePhotos = useMemo(() => {
    if (car.inspection && Array.isArray(car.inspection.evidencePhotoIds)) {
      return car.inspection.evidencePhotoIds as string[];
    }
    return [];
  }, [car]);

  async function handleVerify(status: 'verified' | 'rejected' | 'under_verification' | 'unverified') {
    await onVerify(car, status, reviewNote.trim());
    setActionSuccess(
      status === 'verified'
        ? '✓ Registration Certificate (RC) Approved & Marked Verified!'
        : status === 'rejected'
        ? '✕ RC Document Marked as Rejected'
        : status === 'under_verification'
        ? '⏳ Marked Under Verification'
        : '○ Marked Unverified'
    );
    setTimeout(() => setActionSuccess(''), 4000);
  }

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const verifyStatus = car.verificationStatus || (car.documentPhotoId ? 'under_verification' : 'unverified');

  return (
    <div className="management-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="management-modal wide-car-review-modal" role="dialog" aria-modal="true" aria-labelledby="car-review-title">
        <header>
          <div>
            <span className="car-review-kicker">VEHICLE INSPECTION & VERIFICATION</span>
            <h2 id="car-review-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {car.year} {car.make} {car.model} <span style={{ fontWeight: 500, color: '#64748b', fontSize: '15px' }}>{car.variant}</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={`/car/${encodeURIComponent(car.id)}`}
              target="_blank"
              rel="noreferrer"
              className="car-review-top-link"
              title="Open public marketplace listing"
            >
              <ExternalLink size={14} /> <span>Open public listing</span>
            </a>
            <button aria-label="Close dialog" onClick={onClose}>
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="car-review-modal-content">
          {/* Top Quick Status & Actions Strip */}
          <div className="car-review-quick-strip">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`car-verify-badge large ${verifyStatus}`}>
                {verifyStatus === 'verified'
                  ? '✓ Verified RC'
                  : verifyStatus === 'under_verification'
                  ? '⏳ Under Verification'
                  : verifyStatus === 'rejected'
                  ? '✕ RC Rejected'
                  : '○ Unverified RC'}
              </span>
              <StatusPill value={car.status || 'active'} />
              <span className="car-review-chip">
                Condition: <b>{car.score || 95}/100</b>
              </span>
              <span className="car-review-chip">
                City: <b>{car.city}</b>
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="car-review-edit-btn" onClick={() => onEdit(car)}>
                <Pencil size={14} /> Edit vehicle
              </button>
            </div>
          </div>

          {/* MAIN VERIFICATION CARD */}
          <div className={`car-verify-decision-card ${verifyStatus}`}>
            <div className="decision-header">
              <div className="decision-shield-wrap">
                {verifyStatus === 'verified' ? (
                  <CheckCircle2 size={24} className="text-emerald" />
                ) : verifyStatus === 'rejected' ? (
                  <XCircle size={24} className="text-rose" />
                ) : (
                  <ShieldCheck size={24} className="text-blue" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Registration Certificate (RC) & Legal Document
                  </h3>
                  <span className={`car-verify-badge ${verifyStatus}`}>
                    {verifyStatus === 'verified' ? '✓ RC Document Verified' : verifyStatus === 'under_verification' ? '⏳ Document Submitted (Needs Review)' : verifyStatus === 'rejected' ? '✕ RC Rejected' : '○ No RC Uploaded'}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#475569' }}>
                  Inspect the official government RC document and vehicle registration details below to verify identity, validity and ownership.
                </p>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="decision-meta-grid">
              <div className="decision-meta-item">
                <small>RC Registration Number</small>
                <b className="rc-number-text">{car.documentNumber ? car.documentNumber : <em>Not provided</em>}</b>
              </div>
              <div className="decision-meta-item">
                <small>Document Type</small>
                <b>{car.documentType || 'RC / Registration Certificate'}</b>
              </div>
              <div className="decision-meta-item">
                <small>Verification History</small>
                <span>
                  {car.verifiedBy ? (
                    <>
                      Verified by <b>{car.verifiedBy.name}</b> ({car.verifiedBy.role}) on{' '}
                      {new Date(car.verifiedBy.at).toLocaleDateString('en-IN')}
                    </>
                  ) : (
                    <em style={{ color: '#64748b' }}>Pending administrator review</em>
                  )}
                </span>
              </div>
              {car.verificationNote && (
                <div className="decision-meta-item full">
                  <small>Verification Note</small>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#1e293b', fontWeight: 500 }}>
                    {car.verificationNote}
                  </p>
                </div>
              )}
            </div>

            {/* Document Preview Box */}
            <div className="decision-doc-preview-wrap">
              {car.documentPhotoId ? (
                <div className="decision-doc-viewer">
                  <div className="decision-doc-img-box">
                    <img
                      src={`/api/photos/${encodeURIComponent(car.documentPhotoId)}`}
                      alt="Vehicle RC Document"
                      className="decision-doc-img"
                      onError={e => {
                        (e.currentTarget.parentElement as HTMLElement).innerHTML =
                          '<div class="rc-doc-fallback"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>PDF / Document Attachment</span></div>';
                      }}
                    />
                  </div>
                  <div className="decision-doc-info">
                    <b>Official RC Document Attached</b>
                    <p>High-resolution copy uploaded by the vendor/seller. Open to inspect stamps, engine/chassis numbers and RTO validity.</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <a
                        href={`/api/photos/${encodeURIComponent(car.documentPhotoId)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="management-primary compact"
                      >
                        <ExternalLink size={14} /> Open Full Size / PDF
                      </a>
                      <a
                        href={`/api/photos/${encodeURIComponent(car.documentPhotoId)}`}
                        download={`RC-${car.id}`}
                        className="management-secondary compact"
                      >
                        <Download size={14} /> Download File
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="decision-doc-missing-alert">
                  <ShieldAlert size={24} className="text-amber" />
                  <div>
                    <b>No RC Document Attached</b>
                    <p>
                      The vehicle does not currently have a registration certificate document file. The listing is marked as{' '}
                      <b>Unverified</b>.
                    </p>
                    <button
                      type="button"
                      className="management-secondary compact"
                      style={{ marginTop: '6px' }}
                      onClick={() => onEdit(car)}
                    >
                      <Pencil size={13} /> Edit Listing & Upload Document
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Verification Controls (Only for Admin / Superadmin) */}
            {expectedRole !== 'vendor' && (
              <div className="decision-actions-panel">
                <label className="management-field" style={{ marginBottom: '10px' }}>
                  <span>Reviewer Verification Note</span>
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="e.g. Parivahan record matched, RC valid till 2032, original registration"
                  />
                  <small>This note is recorded in the vehicle audit trail.</small>
                </label>

                {actionSuccess && (
                  <div className="management-banner success" style={{ marginBottom: '10px', padding: '8px 12px' }}>
                    <Check size={16} /> {actionSuccess}
                  </div>
                )}

                <div className="decision-action-buttons">
                  <button
                    type="button"
                    className="decision-btn approve"
                    disabled={verifying}
                    onClick={() => void handleVerify('verified')}
                  >
                    <CheckCircle2 size={16} /> {verifyStatus === 'verified' ? 'Re-Approve RC ✓' : 'Approve RC (Mark Verified) ✓'}
                  </button>
                  <button
                    type="button"
                    className="decision-btn reject"
                    disabled={verifying}
                    onClick={() => void handleVerify('rejected')}
                  >
                    <XCircle size={16} /> Reject RC Document
                  </button>
                  <button
                    type="button"
                    className="decision-btn review"
                    disabled={verifying}
                    onClick={() => void handleVerify('under_verification')}
                  >
                    Set Under Verification
                  </button>
                  <button
                    type="button"
                    className="decision-btn reset"
                    disabled={verifying}
                    onClick={() => void handleVerify('unverified')}
                  >
                    Mark Unverified
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* VEHICLE SPECIFICATIONS */}
          <div className="car-review-specs-wrap">
            <h4 className="car-review-section-title">Key Vehicle Specifications</h4>
            <div className="car-review-specs-grid">
              <div className="spec-tile primary">
                <small>Marketplace Price</small>
                <b>{formatINR(car.price)}</b>
              </div>
              <div className="spec-tile">
                <small>Kilometers Driven</small>
                <b>{car.km.toLocaleString('en-IN')} km</b>
              </div>
              <div className="spec-tile">
                <small>Registration Year</small>
                <b>{car.year}</b>
              </div>
              <div className="spec-tile">
                <small>Fuel Type</small>
                <b>{car.fuel}</b>
              </div>
              <div className="spec-tile">
                <small>Transmission</small>
                <b>{car.transmission}</b>
              </div>
              <div className="spec-tile">
                <small>Ownership</small>
                <b>{car.owners} {car.owners > 1 ? 'Owners' : '1st Owner'}</b>
              </div>
              <div className="spec-tile">
                <small>Exterior Colour</small>
                <b>{car.color || 'Standard'}</b>
              </div>
              <div className="spec-tile">
                <small>Body Style</small>
                <b>{car.body || 'Standard'}</b>
              </div>
              <div className="spec-tile">
                <small>Diagnostic Score</small>
                <b>{car.score || 95}/100</b>
              </div>
              <div className="spec-tile">
                <small>Listing Badge</small>
                <b>{car.badge || 'Cars21 Direct'}</b>
              </div>
              <div className="spec-tile">
                <small>Marketplace Status</small>
                <b>{car.status || 'active'}</b>
              </div>
              <div className="spec-tile">
                <small>Location & City</small>
                <b>{car.city}{car.area ? `, ${car.area}` : ''}</b>
              </div>
            </div>
          </div>

          {/* SELLER & DEALER INFORMATION */}
          <div className="car-review-seller-wrap">
            <h4 className="car-review-section-title">Dealership & Contact Details</h4>
            <div className="car-review-seller-grid">
              <div className="seller-meta-card">
                <small>Vendor / Dealership</small>
                <b>{car.vendorName || (car.vendorId ? 'Dealer partner' : 'Cars21 Direct Listing')}</b>
                {car.vendorSlug && (
                  <a href={`/dealers/${car.vendorSlug}`} target="_blank" rel="noreferrer" className="car-review-mini-link">
                    <Store size={13} /> View dealer showroom
                  </a>
                )}
              </div>
              <div className="seller-meta-card">
                <small>Contact Person</small>
                <b>{car.sellerName || 'Verified seller'}</b>
              </div>
              <div className="seller-meta-card">
                <small>Phone Number</small>
                {car.sellerPhone ? (
                  <a href={`tel:${car.sellerPhone}`} className="car-contact-link">
                    <Phone size={13} /> {car.sellerPhone}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Not provided</span>
                )}
              </div>
              <div className="seller-meta-card">
                <small>WhatsApp Number</small>
                {car.sellerWhatsApp ? (
                  <a
                    href={`https://wa.me/${car.sellerWhatsApp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="car-contact-link whatsapp"
                  >
                    <MessageSquareText size={13} /> {car.sellerWhatsApp}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Not provided</span>
                )}
              </div>
              {car.addedBy && (
                <div className="seller-meta-card full">
                  <small>Listed By Platform User</small>
                  <span>
                    Administrator <b>{car.addedBy.name}</b> ({car.addedBy.role}){car.addedBy.email ? ` · ${car.addedBy.email}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* LISTING PHOTOS GALLERY */}
          {allPhotos.length > 0 && (
            <div className="car-review-gallery-wrap">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 className="car-review-section-title" style={{ margin: 0 }}>
                  Listing Photos ({allPhotos.length})
                </h4>
                <small style={{ color: '#64748b' }}>Click any photo to open full resolution</small>
              </div>
              <div className="car-review-photos-grid">
                {allPhotos.map((photo, index) => (
                  <a
                    key={photo.url + index}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="car-review-photo-link"
                    title={`View ${photo.label}`}
                  >
                    <img src={photo.url} alt={photo.label} loading="lazy" />
                    <span className="photo-tag">{photo.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* INSPECTION DISCLOSURES & EVIDENCE */}
          {car.inspection && (
            <div className="car-review-inspection-wrap">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap' }}>
                <div>
                  <h4 className="car-review-section-title" style={{ margin: 0 }}>
                    Vendor 140-Point Condition Disclosures
                  </h4>
                  <small style={{ color: '#64748b' }}>Vehicle condition reported during listing</small>
                </div>
                {car.inspectionReviewStatus && (
                  <span className={`car-verify-badge ${car.inspectionReviewStatus === 'approved' ? 'verified' : 'under_verification'}`}>
                    Inspection: {car.inspectionReviewStatus.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div className="car-review-checkpoints-grid">
                {[
                  ['Exterior body & paint', car.inspection.exterior],
                  ['Interior & upholstery', car.inspection.interior],
                  ['Engine & transmission', car.inspection.engine],
                  ['Tyres & brakes', car.inspection.tyres],
                  ['Electrical & safety systems', car.inspection.electronics],
                  ['Documents check', car.inspection.documents],
                  ['Road test diagnostics', car.inspection.roadTest],
                  ['Accident / repair history', car.inspection.accidentHistory]
                ]
                  .filter(([, text]) => Boolean(text))
                  .map(([title, text]) => (
                    <div className="checkpoint-card" key={String(title)}>
                      <b>{title}</b>
                      <p>{String(text)}</p>
                    </div>
                  ))}
              </div>

              {Boolean(car.inspection.notes) && (
                <div className="inspection-notes-card">
                  <b>Inspector Notes:</b>
                  <p>{String(car.inspection.notes)}</p>
                </div>
              )}

              {evidencePhotos.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <b style={{ fontSize: '13px', color: '#1e293b' }}>
                    Inspection Diagnostic Evidence ({evidencePhotos.length} photos)
                  </b>
                  <div className="car-review-photos-grid" style={{ marginTop: '6px' }}>
                    {evidencePhotos.map((pid, idx) => (
                      <a
                        key={pid + idx}
                        href={`/api/photos/${encodeURIComponent(pid)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="car-review-photo-link"
                      >
                        <img src={`/api/photos/${encodeURIComponent(pid)}`} alt={`Evidence ${idx + 1}`} loading="lazy" />
                        <span className="photo-tag">Evidence #{idx + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="management-form-actions" style={{ marginTop: '20px', paddingTop: '16px' }}>
            <button type="button" className="management-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="management-primary" onClick={() => onEdit(car)}>
              <Pencil size={15} /> Edit listing details
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
