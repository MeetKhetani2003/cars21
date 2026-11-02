'use client';

import { useEffect, useState } from 'react';
import { Check, MapPin, Pencil, Plus, RefreshCw, Search, Star, Trash2, X } from 'lucide-react';

export type City = {
  id: string;
  name: string;
  state: string;
  popular: boolean;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
};

const blankCity: { name: string; state: string; popular: boolean; status: 'active' | 'inactive' } = { name: '', state: '', popular: false, status: 'active' };

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

export function CityManager() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<'new' | City | null>(null);
  const [draft, setDraft] = useState(blankCity);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ cities: City[] }>('/api/admin/cities');
      setCities(result.cities || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load cities.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setDraft(blankCity);
    setEditor('new');
  }

  function openEdit(city: City) {
    setDraft({
      name: city.name,
      state: city.state,
      popular: Boolean(city.popular),
      status: city.status
    });
    setEditor(city);
  }

  async function saveCity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editor && editor !== 'new') {
        await request(`/api/admin/cities/${encodeURIComponent(editor.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(draft)
        });
        setNotice(`City "${draft.name}" updated successfully.`);
      } else {
        await request('/api/admin/cities', {
          method: 'POST',
          body: JSON.stringify(draft)
        });
        setNotice(`City "${draft.name}" added to marketplace locations.`);
      }
      setEditor(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save city.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(city: City) {
    const nextStatus = city.status === 'active' ? 'inactive' : 'active';
    setError('');
    try {
      await request(`/api/admin/cities/${encodeURIComponent(city.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setCities(curr => curr.map(c => c.id === city.id ? { ...c, status: nextStatus } : c));
      setNotice(`"${city.name}" marked as ${nextStatus}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Status update failed.');
    }
  }

  async function togglePopular(city: City) {
    const nextPopular = !city.popular;
    setError('');
    try {
      await request(`/api/admin/cities/${encodeURIComponent(city.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ popular: nextPopular })
      });
      setCities(curr => curr.map(c => c.id === city.id ? { ...c, popular: nextPopular } : c));
      setNotice(`"${city.name}" ${nextPopular ? 'marked as featured metro city' : 'removed from featured metro cities'}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Update failed.');
    }
  }

  async function deleteCity(city: City) {
    if (!window.confirm(`Permanently remove ${city.name} (${city.state}) from marketplace cities?`)) return;
    setError('');
    try {
      await request(`/api/admin/cities/${encodeURIComponent(city.id)}`, { method: 'DELETE' });
      setCities(curr => curr.filter(c => c.id !== city.id));
      setNotice(`City "${city.name}" deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete city.');
    }
  }

  const filtered = cities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="management-taxonomy-manager">
      <div className="management-section-heading management-list-heading">
        <div>
          <span className="eyebrow">LOCATION TAXONOMY</span>
          <h2>Marketplace Cities</h2>
          <p>Configure active Indian cities and highlight featured metro hubs across search filters and homepage showcases.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="management-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="management-primary compact" onClick={openCreate}>
            <Plus size={17} /> Add city
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
            placeholder="Search city name or state…"
            aria-label="Search cities"
          />
        </label>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          {filtered.length} {filtered.length === 1 ? 'city' : 'cities'}
        </span>
      </div>

      <div className="management-vendor-grid" style={{ marginTop: '16px' }}>
        {filtered.map(city => (
          <article className="management-vendor-card" key={city.id} style={{ display: 'grid', gap: '8px' }}>
            <div className="management-vendor-top">
              <span className="management-vendor-icon" style={{ background: city.popular ? '#fef3c7' : '#e0e7ff', color: city.popular ? '#d97706' : '#4338ca' }}>
                <MapPin size={18} />
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {city.popular && (
                  <span className="management-status" style={{ background: '#fef3c7', color: '#b45309' }}>
                    <Star size={11} fill="currentColor" style={{ marginRight: '3px' }} /> Metro
                  </span>
                )}
                <span className={`management-status ${city.status === 'active' ? 'active' : 'paused'}`}>
                  {city.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <h3 style={{ margin: '4px 0 0', fontSize: '18px' }}>{city.name}</h3>
            <p className="management-vendor-person" style={{ margin: 0, color: '#64748b' }}>
              State: <strong>{city.state}</strong>
            </p>

            <div className="management-vendor-bottom" style={{ marginTop: '10px' }}>
              <button
                className="reset"
                onClick={() => void togglePopular(city)}
                title="Toggle featured metro status"
              >
                {city.popular ? '★ Featured' : '☆ Make Metro'}
              </button>
              <div>
                <button className="reset" onClick={() => openEdit(city)}><Pencil size={13} /> Edit</button>
                <button
                  className={city.status === 'active' ? 'suspend' : 'activate'}
                  onClick={() => void toggleStatus(city)}
                >
                  {city.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button className="suspend" onClick={() => void deleteCity(city)}><Trash2 size={13} /></button>
              </div>
            </div>
          </article>
        ))}

        {!filtered.length && !loading && (
          <div className="management-empty" style={{ gridColumn: '1 / -1' }}>
            <MapPin size={28} />
            <b>No cities found</b>
            <span>{search ? 'Try adjusting your search query.' : 'Click "+ Add city" to create the first city.'}</span>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {editor && (
        <div className="management-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditor(null); }}>
          <section className="management-modal" role="dialog" aria-modal="true" style={{ maxWidth: '440px' }}>
            <header>
              <h2>{editor === 'new' ? 'Add Marketplace City' : `Edit ${editor.name}`}</h2>
              <button aria-label="Close dialog" onClick={() => setEditor(null)}><X size={19} /></button>
            </header>
            <form className="management-form" onSubmit={saveCity}>
              <label className="management-field">
                City name
                <input
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Bengaluru"
                />
              </label>

              <label className="management-field">
                State / Region
                <input
                  required
                  maxLength={80}
                  value={draft.state}
                  onChange={e => setDraft({ ...draft, state: e.target.value })}
                  placeholder="e.g. Karnataka"
                />
              </label>

              <div style={{ display: 'grid', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={draft.popular}
                    onChange={e => setDraft({ ...draft, popular: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Featured Metro City (shown in prominent quick filters)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={draft.status === 'active'}
                    onChange={e => setDraft({ ...draft, status: e.target.checked ? 'active' : 'inactive' })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Active on marketplace (visible in car filters)</span>
                </label>
              </div>

              <div className="management-form-actions">
                <button type="button" className="management-secondary" onClick={() => setEditor(null)}>
                  Cancel
                </button>
                <button className="management-primary" disabled={saving}>
                  {saving ? 'Saving…' : editor === 'new' ? 'Add city' : 'Save changes'} <Check size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
