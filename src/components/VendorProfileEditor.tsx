'use client';

import { useState, type FormEvent } from 'react';
import { Check, ImagePlus, MapPin, Trash2, Upload } from 'lucide-react';

export type VendorBusinessProfile = {
  id: string; name: string; businessName: string; email: string; phone: string; city: string;
  inquiryEmail: string; inquiryWhatsApp: string; subscription?: { status: string; startAt: string; endAt: string; planName?: string; plan?: { name: string; price: number; durationDays: number; maxListings: number; maxImagesPerListing: number; features: Record<string, boolean> } } | null;
  area: string; address: string; description: string; website: string; workingHours: string;
  establishedYear: number | null; specialties: string[]; logoPhotoId: string; coverPhotoId: string;
  shopPhotoIds: string[]; profileUrl?: string;
};

type Props = {
  initial: VendorBusinessProfile;
  endpoint: string;
  superadmin?: boolean;
  editableEmail?: boolean;
  onSaved?: (profile: VendorBusinessProfile, profileUrl?: string) => void;
};

export function VendorProfileEditor({ initial, endpoint, superadmin = false, editableEmail = false, onSaved }: Props) {
  const [profile, setProfile] = useState(initial);
  const [logoPhotoId, setLogoPhotoId] = useState(initial.logoPhotoId || '');
  const [coverPhotoId, setCoverPhotoId] = useState(initial.coverPhotoId || '');
  const [shopPhotoIds, setShopPhotoIds] = useState(initial.shopPhotoIds || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    if (superadmin) form.append('vendorId', initial.id);
    const response = await fetch('/api/photos', { method: 'POST', credentials: 'same-origin', body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Photo upload failed.');
    return String(result.id);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const logoFile = values.get('logo') as File;
      const coverFile = values.get('cover') as File;
      const galleryFiles = values.getAll('shopPhotos').filter((item): item is File => item instanceof File && item.size > 0);
      if (shopPhotoIds.length + galleryFiles.length > 8) throw new Error('Keep up to 8 showroom photos on your profile.');
      const nextLogo = logoFile?.size ? await upload(logoFile) : logoPhotoId;
      const nextCover = coverFile?.size ? await upload(coverFile) : coverPhotoId;
      const nextGallery = [...shopPhotoIds, ...await Promise.all(galleryFiles.map(upload))];
      const payload = {
        ...(superadmin ? { accountType: 'vendor' } : {}),
        name: String(values.get('name') || '').trim(), businessName: String(values.get('businessName') || '').trim(),
        ...(editableEmail ? { email: String(values.get('email') || '').trim() } : {}),
        phone: String(values.get('phone') || '').trim(), city: String(values.get('city') || '').trim(),
        inquiryEmail: String(values.get('inquiryEmail') || '').trim(), inquiryWhatsApp: String(values.get('inquiryWhatsApp') || '').trim(),
        area: String(values.get('area') || '').trim(), address: String(values.get('address') || '').trim(),
        description: String(values.get('description') || '').trim(), website: String(values.get('website') || '').trim(),
        workingHours: String(values.get('workingHours') || '').trim(),
        establishedYear: String(values.get('establishedYear') || '') ? Number(values.get('establishedYear')) : null,
        specialties: String(values.get('specialties') || '').split(',').map(value => value.trim()).filter(Boolean).slice(0, 12),
        logoPhotoId: nextLogo, coverPhotoId: nextCover, shopPhotoIds: nextGallery,
      };
      const response = await fetch(endpoint, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Business profile could not be saved.');
      const updated: VendorBusinessProfile = { ...profile, ...payload, logoPhotoId: nextLogo, coverPhotoId: nextCover, shopPhotoIds: nextGallery };
      setLogoPhotoId(nextLogo); setCoverPhotoId(nextCover); setShopPhotoIds(nextGallery); setProfile(updated);
      setNotice('Business profile saved. Your public page will show the updated details.');
      onSaved?.(updated, result.profileUrl);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Business profile could not be saved.'); }
    finally { setSaving(false); }
  }

  return <form className="management-form vendor-profile-editor" onSubmit={submit}>
    <div className="vendor-profile-editor-heading"><div><span className="eyebrow">PUBLIC DEALER PAGE</span><h2>Business profile</h2><p>Help local buyers understand your dealership before they browse your cars.</p></div><span className="vendor-profile-editor-mark"><MapPin size={19}/></span></div>
    <div className="vendor-profile-form-grid">
      <label className="management-field">Contact person<input required name="name" maxLength={100} defaultValue={profile.name}/></label>
      <label className="management-field">Business name<input required name="businessName" maxLength={120} defaultValue={profile.businessName}/></label>
      <label className="management-field">Account email<input required name="email" type="email" maxLength={160} defaultValue={profile.email} disabled={!editableEmail}/></label>
      <label className="management-field">Business phone<input required name="phone" type="tel" maxLength={24} defaultValue={profile.phone}/></label>
      <label className="management-field">Inquiry email<input required name="inquiryEmail" type="email" maxLength={160} defaultValue={profile.inquiryEmail || profile.email}/><small>New saved inquiries are emailed here when mail delivery is configured.</small></label>
      <label className="management-field">Inquiry WhatsApp<input required name="inquiryWhatsApp" type="tel" maxLength={24} defaultValue={profile.inquiryWhatsApp || profile.phone}/><small>Buyers get a WhatsApp draft addressed to this number.</small></label>
      <label className="management-field">City<input required name="city" maxLength={80} defaultValue={profile.city}/></label>
      <label className="management-field">Area / locality<input name="area" maxLength={120} defaultValue={profile.area} placeholder="Koramangala"/></label>
      <label className="management-field vendor-profile-wide">Street address<input name="address" maxLength={240} defaultValue={profile.address} placeholder="Street, landmark, building"/></label>
      <label className="management-field vendor-profile-wide">About your dealership<textarea name="description" rows={4} maxLength={1200} defaultValue={profile.description} placeholder="Tell buyers what makes your dealership and service different."/></label>
      <label className="management-field">Website<input name="website" type="url" maxLength={240} defaultValue={profile.website} placeholder="https://example.com"/></label>
      <label className="management-field">Business hours<input name="workingHours" maxLength={160} defaultValue={profile.workingHours} placeholder="Mon–Sat · 10:00 am–7:00 pm"/></label>
      <label className="management-field">Established year<input name="establishedYear" type="number" min="1900" max="2100" defaultValue={profile.establishedYear || ''} placeholder="2012"/></label>
      <label className="management-field">Specialities<input name="specialties" maxLength={400} defaultValue={profile.specialties.join(', ')} placeholder="SUVs, Electric cars, Certified vehicles"/><small>Separate items with commas.</small></label>
    </div>
    <div className="vendor-photo-fields">
      <div className="vendor-photo-upload"><span className="vendor-photo-upload-title"><ImagePlus size={17}/> Business logo</span><span className="vendor-photo-preview vendor-photo-logo">{logoPhotoId ? <img src={`/api/photos/${encodeURIComponent(logoPhotoId)}`} alt="Current business logo"/> : <ImagePlus size={24}/>}</span><input type="file" name="logo" accept="image/jpeg,image/png,image/webp,image/avif"/><small>Square image · JPEG, PNG, WebP or AVIF · 4 MB max</small>{logoPhotoId && <button type="button" className="vendor-photo-clear" onClick={()=>setLogoPhotoId('')}><Trash2 size={13}/> Remove logo</button>}</div>
      <div className="vendor-photo-upload"><span className="vendor-photo-upload-title"><ImagePlus size={17}/> Cover photo</span><span className="vendor-photo-preview vendor-photo-cover">{coverPhotoId ? <img src={`/api/photos/${encodeURIComponent(coverPhotoId)}`} alt="Current dealership cover"/> : <ImagePlus size={24}/>}</span><input type="file" name="cover" accept="image/jpeg,image/png,image/webp,image/avif"/><small>Wide showroom or exterior photo · 4 MB max</small>{coverPhotoId && <button type="button" className="vendor-photo-clear" onClick={()=>setCoverPhotoId('')}><Trash2 size={13}/> Remove cover</button>}</div>
      <div className="vendor-photo-upload vendor-gallery-upload"><span className="vendor-photo-upload-title"><ImagePlus size={17}/> Showroom photos <small>{shopPhotoIds.length}/8</small></span><div className="vendor-gallery-previews">{shopPhotoIds.map((id,index)=><span className="vendor-gallery-thumb" key={`${id}-${index}`}><img src={`/api/photos/${encodeURIComponent(id)}`} alt={`Showroom photo ${index + 1}`}/><button type="button" aria-label={`Remove showroom photo ${index + 1}`} onClick={()=>setShopPhotoIds(current=>current.filter((_,itemIndex)=>itemIndex!==index))}><Trash2 size={13}/></button></span>)}</div><label className="vendor-gallery-picker"><Upload size={15}/><span>Add showroom photos</span><input type="file" name="shopPhotos" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={event=>{if(shopPhotoIds.length+event.currentTarget.files!.length>8){setError('Keep up to 8 showroom photos on your profile.');event.currentTarget.value='';}else setError('');}}/></label><small>Up to 8 photos · JPEG, PNG, WebP or AVIF · 4 MB each</small></div>
    </div>
    {error && <p className="field-error" role="alert">{error}</p>}{notice && <p className="buyer-profile-success" role="status">{notice}</p>}
    <div className="management-form-actions"><button className="management-primary" disabled={saving}>{saving ? 'Uploading and saving…' : 'Save business profile'} <Check size={16}/></button></div>
  </form>;
}
