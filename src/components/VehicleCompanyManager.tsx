'use client';

import { useEffect, useState } from 'react';
import { Building2, Check, Pencil, Plus, RefreshCw, Search, Star, Trash2, X } from 'lucide-react';

export type Make = {
  id: string;
  name: string;
  country: string;
  code: string;
  popular: boolean;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
};

const blankMake: { name: string; country: string; code: string; popular: boolean; status: 'active' | 'inactive' } = { name: '', country: '', code: '', popular: false, status: 'active' };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body as T;
}

export function VehicleCompanyManager() {
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<'new' | Make | null>(null);
  const [draft, setDraft] = useState(blankMake);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ makes: Make[] }>('/api/admin/makes');
      setMakes(result.makes || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load vehicle companies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setDraft(blankMake);
    setEditor('new');
  }

  function openEdit(make: Make) {
    setDraft({
      name: make.name,
      country: make.country || '',
      code: make.code || '',
      popular: Boolean(make.popular),
      status: make.status
    });
    setEditor(make);
  }

  async function saveMake(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editor && editor !== 'new') {
        await request(`/api/admin/makes/${encodeURIComponent(editor.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(draft)
        });
        setNotice(`Vehicle company "${draft.name}" updated successfully.`);
      } else {
        await request('/api/admin/makes', {
          method: 'POST',
          body: JSON.stringify(draft)
        });
        setNotice(`Vehicle company "${draft.name}" added to marketplace brands.`);
      }
      setEditor(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save vehicle company.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(make: Make) {
    const nextStatus = make.status === 'active' ? 'inactive' : 'active';
    setError('');
    try {
      await request(`/api/admin/makes/${encodeURIComponent(make.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setMakes(curr => curr.map(m => m.id === make.id ? { ...m, status: nextStatus } : m));
      setNotice(`"${make.name}" marked as ${nextStatus}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Status update failed.');
    }
  }

  async function togglePopular(make: Make) {
    const nextPopular = !make.popular;
    setError('');
    try {
      await request(`/api/admin/makes/${encodeURIComponent(make.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ popular: nextPopular })
      });
      setMakes(curr => curr.map(m => m.id === make.id ? { ...m, popular: nextPopular } : m));
      setNotice(`"${make.name}" ${nextPopular ? 'featured on homepage brands showcase' : 'removed from featured brands'}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Update failed.');
    }
  }

  async function deleteMake(make: Make) {
    if (!window.confirm(`Permanently remove vehicle manufacturer "${make.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await request(`/api/admin/makes/${encodeURIComponent(make.id)}`, { method: 'DELETE' });
      setMakes(curr => curr.filter(m => m.id !== make.id));
      setNotice(`Vehicle company "${make.name}" deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete vehicle company.');
    }
  }

  const filtered = makes.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.country.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="management-taxonomy-manager">
      <div className="management-section-heading management-list-heading">
        <div>
          <span className="eyebrow">AUTOMOTIVE MANUFACTURERS</span>
          <h2>Vehicle Companies &amp; Brands</h2>
          <p>Manage supported car manufacturers, brand codes, and select which brands appear on the homepage popular strip.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="management-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="management-primary compact" onClick={openCreate}>
            <Plus size={17} /> Add company
          </button>
        </div>
      </div>

      {error && <p className="management-error" role="alert">{error}</p>}
      {notice && <p className="buyer-profile-success" role="status">{notice}</p>}

      <div className="management-toolbar">
        <label className="management-search" style={{ flex: 1, maxWidth: '420px' }}>
          <Search size={17} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search manufacturer, country, or code…"
            aria-label="Search companies"
          />
        </label>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
        </span>
      </div>

      <div className="management-vendor-grid" style={{ marginTop: '16px' }}>
        {filtered.map(make => (
          <article className="management-vendor-card" key={make.id} style={{ display: 'grid', gap: '8px' }}>
            <div className="management-vendor-top">
              <span
                className="management-vendor-icon"
                style={{
                  background: make.popular ? '#fef3c7' : '#ecfdf5',
                  color: make.popular ? '#d97706' : '#059669',
                  fontWeight: 800,
                  fontSize: '13px'
                }}
              >
                {make.code || make.name.slice(0, 2).toUpperCase()}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {make.popular && (
                  <span className="management-status" style={{ background: '#fef3c7', color: '#b45309' }}>
                    <Star size={11} fill="currentColor" style={{ marginRight: '3px' }} /> Featured
                  </span>
                )}
                <span className={`management-status ${make.status === 'active' ? 'active' : 'paused'}`}>
                  {make.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <h3 style={{ margin: '4px 0 0', fontSize: '18px' }}>{make.name}</h3>
            <p className="management-vendor-person" style={{ margin: 0, color: '#64748b' }}>
              Origin: <strong>{make.country || 'Global'}</strong> · Code: <strong>{make.code || make.name.slice(0, 2).toUpperCase()}</strong>
            </p>

            <div className="management-vendor-bottom" style={{ marginTop: '10px' }}>
              <button
                className="reset"
                onClick={() => void togglePopular(make)}
                title="Toggle featured status on homepage"
              >
                {make.popular ? '★ Featured' : '☆ Feature on Home'}
              </button>
              <div>
                <button className="reset" onClick={() => openEdit(make)}><Pencil size={13} /> Edit</button>
                <button
                  className={make.status === 'active' ? 'suspend' : 'activate'}
                  onClick={() => void toggleStatus(make)}
                >
                  {make.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button className="suspend" onClick={() => void deleteMake(make)}><Trash2 size={13} /></button>
              </div>
            </div>
          </article>
        ))}

        {!filtered.length && !loading && (
          <div className="management-empty" style={{ gridColumn: '1 / -1' }}>
            <Building2 size={28} />
            <b>No vehicle companies found</b>
            <span>{search ? 'Try adjusting your search query.' : 'Click "+ Add company" to create the first vehicle manufacturer.'}</span>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {editor && (
        <div className="management-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditor(null); }}>
          <section className="management-modal" role="dialog" aria-modal="true" style={{ maxWidth: '440px' }}>
            <header>
              <h2>{editor === 'new' ? 'Add Vehicle Company' : `Edit ${editor.name}`}</h2>
              <button aria-label="Close dialog" onClick={() => setEditor(null)}><X size={19} /></button>
            </header>
            <form className="management-form" onSubmit={saveMake}>
              <label className="management-field">
                Brand / Manufacturer name
                <input
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={e => {
                    const name = e.target.value;
                    const autoCode = draft.code ? draft.code : name.slice(0, 2).toUpperCase();
                    setDraft({ ...draft, name, code: autoCode });
                  }}
                  placeholder="e.g. Hyundai"
                />
              </label>

              <div className="management-form-pair">
                <label className="management-field">
                  Country of origin
                  <input
                    maxLength={80}
                    value={draft.country}
                    onChange={e => setDraft({ ...draft, country: e.target.value })}
                    placeholder="e.g. South Korea"
                  />
                </label>

                <label className="management-field">
                  Brand code (2-4 letters)
                  <input
                    maxLength={10}
                    value={draft.code}
                    onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. HY"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={draft.popular}
                    onChange={e => setDraft({ ...draft, popular: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Feature on Home Page (Popular Brands Strip)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={draft.status === 'active'}
                    onChange={e => setDraft({ ...draft, status: e.target.checked ? 'active' : 'inactive' })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Active brand (visible in inventory and search filters)</span>
                </label>
              </div>

              <div className="management-form-actions">
                <button type="button" className="management-secondary" onClick={() => setEditor(null)}>
                  Cancel
                </button>
                <button className="management-primary" disabled={saving}>
                  {saving ? 'Saving…' : editor === 'new' ? 'Add company' : 'Save changes'} <Check size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
