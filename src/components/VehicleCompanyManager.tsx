'use client';

import { useEffect, useState, useMemo } from 'react';
import { Building2, Calendar, Car, Check, Layers, Pencil, Plus, RefreshCw, Search, Star, Trash2, X } from 'lucide-react';

export type CarModel = {
  id: string;
  name: string;
  body: string;
  years: number[];
  popular: boolean;
  status: 'active' | 'inactive';
};

export type Make = {
  id: string;
  name: string;
  country: string;
  code: string;
  popular: boolean;
  status: 'active' | 'inactive';
  models?: CarModel[];
  createdAt?: string;
  updatedAt?: string;
};

const ALL_YEARS = [2022, 2023, 2024, 2025, 2026];

const blankMake: { name: string; country: string; code: string; popular: boolean; status: 'active' | 'inactive' } = {
  name: '',
  country: '',
  code: '',
  popular: false,
  status: 'active'
};

const blankModel: { name: string; body: string; years: number[]; popular: boolean; status: 'active' | 'inactive' } = {
  name: '',
  body: 'SUV',
  years: [2022, 2023, 2024, 2025, 2026],
  popular: false,
  status: 'active'
};

const BODY_OPTIONS = [
  'SUV',
  'Compact SUV',
  'Midsize SUV',
  'Hatchback',
  'Sedan',
  'MUV',
  'SUV Coupe',
  'Electric SUV',
  'Crossover',
  'Pickup',
  'Van',
  'Roadster'
];

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

  // Models Management Modal State
  const [selectedMakeForModels, setSelectedMakeForModels] = useState<Make | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [modelBodyFilter, setModelBodyFilter] = useState('all');
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [editingModel, setEditingModel] = useState<CarModel | null>(null);
  const [modelDraft, setModelDraft] = useState(blankModel);
  const [modelSaving, setModelSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ makes: Make[] }>('/api/admin/makes');
      const list = result.makes || [];
      setMakes(list);
      // Keep models modal synchronized if open
      if (selectedMakeForModels) {
        const refreshed = list.find(m => m.id === selectedMakeForModels.id);
        if (refreshed) setSelectedMakeForModels(refreshed);
      }
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

  function openModelsModal(make: Make) {
    setSelectedMakeForModels(make);
    setModelSearch('');
    setModelBodyFilter('all');
    setIsAddingModel(false);
    setEditingModel(null);
    setModelDraft(blankModel);
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
    if (!window.confirm(`Permanently remove vehicle manufacturer "${make.name}" and all its models? This cannot be undone.`)) return;
    setError('');
    try {
      await request(`/api/admin/makes/${encodeURIComponent(make.id)}`, { method: 'DELETE' });
      setMakes(curr => curr.filter(m => m.id !== make.id));
      if (selectedMakeForModels?.id === make.id) setSelectedMakeForModels(null);
      setNotice(`Vehicle company "${make.name}" deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete vehicle company.');
    }
  }

  // --- MODEL ACTIONS ---
  async function submitSaveModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMakeForModels) return;
    setModelSaving(true);
    setError('');
    try {
      if (editingModel) {
        await request(`/api/admin/makes/${encodeURIComponent(selectedMakeForModels.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'update_model',
            model: {
              id: editingModel.id,
              name: modelDraft.name.trim(),
              body: modelDraft.body,
              years: modelDraft.years,
              popular: modelDraft.popular,
              status: modelDraft.status
            }
          })
        });
        setNotice(`Model "${modelDraft.name}" updated successfully.`);
      } else {
        await request(`/api/admin/makes/${encodeURIComponent(selectedMakeForModels.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'add_model',
            model: {
              name: modelDraft.name.trim(),
              body: modelDraft.body,
              years: modelDraft.years,
              popular: modelDraft.popular,
              status: modelDraft.status
            }
          })
        });
        setNotice(`Model "${modelDraft.name}" added to ${selectedMakeForModels.name}.`);
      }
      setIsAddingModel(false);
      setEditingModel(null);
      setModelDraft(blankModel);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save model.');
    } finally {
      setModelSaving(false);
    }
  }

  async function toggleModelStatus(model: CarModel) {
    if (!selectedMakeForModels) return;
    const nextStatus = model.status === 'active' ? 'inactive' : 'active';
    try {
      await request(`/api/admin/makes/${encodeURIComponent(selectedMakeForModels.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'update_model',
          model: { ...model, status: nextStatus }
        })
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update model status.');
    }
  }

  async function deleteModel(model: CarModel) {
    if (!selectedMakeForModels) return;
    if (!window.confirm(`Delete model "${model.name}" from ${selectedMakeForModels.name}?`)) return;
    try {
      await request(`/api/admin/makes/${encodeURIComponent(selectedMakeForModels.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'delete_model',
          modelId: model.id
        })
      });
      setNotice(`Model "${model.name}" removed.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete model.');
    }
  }

  function startEditModel(model: CarModel) {
    setEditingModel(model);
    setModelDraft({
      name: model.name,
      body: model.body || 'SUV',
      years: model.years && model.years.length ? model.years : ALL_YEARS,
      popular: Boolean(model.popular),
      status: model.status || 'active'
    });
    setIsAddingModel(true);
  }

  const filtered = makes.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.country.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  // Filtered models for active modal
  const activeModels = useMemo(() => {
    if (!selectedMakeForModels?.models) return [];
    return selectedMakeForModels.models.filter(m => {
      const matchQuery = m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
        (m.body && m.body.toLowerCase().includes(modelSearch.toLowerCase()));
      const matchBody = modelBodyFilter === 'all' || m.body.toLowerCase() === modelBodyFilter.toLowerCase();
      return matchQuery && matchBody;
    });
  }, [selectedMakeForModels, modelSearch, modelBodyFilter]);

  const bodyTypesInCurrentMake = useMemo(() => {
    if (!selectedMakeForModels?.models) return [];
    const set = new Set<string>();
    selectedMakeForModels.models.forEach(m => {
      if (m.body) set.add(m.body);
    });
    return Array.from(set).sort();
  }, [selectedMakeForModels]);

  return (
    <section className="management-taxonomy-manager">
      <div className="management-section-heading management-list-heading">
        <div>
          <span className="eyebrow">AUTOMOTIVE MANUFACTURERS &amp; VEHICLE MODELS</span>
          <h2>Vehicle Companies &amp; Car Models (2022–2026)</h2>
          <p>
            Manage supported vehicle brands and every car model from 2022 to the current year. Models dynamically appear in car listing creation and filter dropdowns.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
          {filtered.length} {filtered.length === 1 ? 'company' : 'companies'} listed
        </span>
      </div>

      <div className="management-vendor-grid" style={{ marginTop: '16px' }}>
        {filtered.map(make => {
          const modelsCount = make.models?.length || 0;
          const activeModelsCount = make.models?.filter(m => m.status !== 'inactive').length || 0;
          return (
            <article className="management-vendor-card" key={make.id} style={{ display: 'grid', gap: '10px' }}>
              <div className="management-vendor-top">
                <span
                  className="management-vendor-icon"
                  style={{
                    background: make.popular ? '#fef3c7' : '#eff6ff',
                    color: make.popular ? '#d97706' : '#2563eb',
                    fontWeight: 800,
                    fontSize: '13px'
                  }}
                >
                  {make.code || make.name.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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

              <div>
                <h3 style={{ margin: '4px 0 2px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{make.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#ff5c00', background: 'rgba(255, 92, 0, 0.08)', padding: '2px 7px', borderRadius: '6px' }}>
                    {make.code || make.name.slice(0, 2).toUpperCase()}
                  </span>
                </h3>
                <p className="management-vendor-person" style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                  Origin: <strong>{make.country || 'Global'}</strong>
                </p>
              </div>

              {/* MODEL COUNT & MANAGE MODELS BUTTON */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 750, color: '#0f172a' }}>
                    <Car size={14} style={{ color: '#2563eb' }} />
                    <span>{modelsCount} Car Models</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    {activeModelsCount} active · 2022 to 2026
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openModelsModal(make)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 11px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.18s'
                  }}
                  title={`View and manage ${make.name} car models`}
                >
                  <Layers size={13} /> Manage Models
                </button>
              </div>

              <div className="management-vendor-bottom" style={{ marginTop: '4px' }}>
                <button
                  className="reset"
                  onClick={() => void togglePopular(make)}
                  title="Toggle featured status on homepage"
                  style={{ fontSize: '11px' }}
                >
                  {make.popular ? '★ Featured' : '☆ Feature'}
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="reset" onClick={() => openEdit(make)} title="Edit company details">
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    className={make.status === 'active' ? 'suspend' : 'activate'}
                    onClick={() => void toggleStatus(make)}
                    title={make.status === 'active' ? 'Deactivate company' : 'Activate company'}
                  >
                    {make.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button className="suspend" onClick={() => void deleteMake(make)} title="Delete company">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!filtered.length && !loading && (
          <div className="management-empty" style={{ gridColumn: '1 / -1' }}>
            <Building2 size={28} />
            <b>No vehicle companies found</b>
            <span>{search ? 'Try adjusting your search query.' : 'Click "+ Add company" to create the first vehicle manufacturer.'}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODELS CATALOGUE MANAGEMENT MODAL (2022 to 2026)
         ========================================================================= */}
      {selectedMakeForModels && (
        <div
          className="management-modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) {
              setSelectedMakeForModels(null);
              setIsAddingModel(false);
              setEditingModel(null);
            }
          }}
        >
          <section
            className="management-modal"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '820px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontWeight: 800,
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {selectedMakeForModels.code || selectedMakeForModels.name.slice(0, 2).toUpperCase()}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                    {selectedMakeForModels.name} — Car Models (2022–2026)
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Comprehensive catalogue of all {selectedMakeForModels.name} models sold or produced from 2022 to current year (2026).
                </p>
              </div>
              <button
                aria-label="Close dialog"
                onClick={() => {
                  setSelectedMakeForModels(null);
                  setIsAddingModel(false);
                  setEditingModel(null);
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </header>

            {/* ACTION & SEARCH BAR */}
            <div style={{ padding: '16px 0 10px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
                <label className="management-search" style={{ flex: 1 }}>
                  <Search size={16} />
                  <input
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                    placeholder="Search model name or body type…"
                    style={{ fontSize: '13px' }}
                  />
                </label>

                {bodyTypesInCurrentMake.length > 0 && (
                  <select
                    value={modelBodyFilter}
                    onChange={e => setModelBodyFilter(e.target.value)}
                    style={{
                      padding: '0 10px',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#ffffff'
                    }}
                  >
                    <option value="all">All body types ({selectedMakeForModels.models?.length || 0})</option>
                    {bodyTypesInCurrentMake.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="button"
                className="management-primary compact"
                onClick={() => {
                  setEditingModel(null);
                  setModelDraft(blankModel);
                  setIsAddingModel(!isAddingModel);
                }}
                style={{ height: '38px' }}
              >
                {isAddingModel ? <X size={15} /> : <Plus size={15} />}
                {isAddingModel ? 'Cancel' : 'Add Model'}
              </button>
            </div>

            {/* ADD / EDIT MODEL INLINE DRAWER */}
            {isAddingModel && (
              <form
                onSubmit={submitSaveModel}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'grid',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    {editingModel ? `Edit Model: ${editingModel.name}` : `Add New ${selectedMakeForModels.name} Car Model (2022–2026)`}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Release Years: 2022 to Current</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <label className="management-field" style={{ margin: 0 }}>
                    Model Name *
                    <input
                      required
                      value={modelDraft.name}
                      onChange={e => setModelDraft({ ...modelDraft, name: e.target.value })}
                      placeholder="e.g. Brezza, Punch, Curvv, Fronx"
                      maxLength={80}
                      style={{ fontSize: '13px' }}
                    />
                  </label>

                  <label className="management-field" style={{ margin: 0 }}>
                    Body Type *
                    <select
                      value={modelDraft.body}
                      onChange={e => setModelDraft({ ...modelDraft, body: e.target.value })}
                      style={{ fontSize: '13px' }}
                    >
                      {BODY_OPTIONS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* YEARS SELECTOR (2022 - 2026) */}
                <div>
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Applicable Model Years (2022 – 2026)
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {ALL_YEARS.map(yr => {
                      const checked = modelDraft.years.includes(yr);
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            const nextYears = checked
                              ? modelDraft.years.filter(y => y !== yr)
                              : [...modelDraft.years, yr].sort((a, b) => a - b);
                            setModelDraft({ ...modelDraft, years: nextYears.length ? nextYears : [yr] });
                          }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: checked ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            background: checked ? '#eff6ff' : '#ffffff',
                            color: checked ? '#1d4ed8' : '#475569',
                            fontWeight: checked ? 750 : 600,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {checked ? `✓ ${yr}` : yr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={modelDraft.popular}
                      onChange={e => setModelDraft({ ...modelDraft, popular: e.target.checked })}
                    />
                    <span>Popular / Featured Model (shown in quick-filters)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={modelDraft.status === 'active'}
                      onChange={e => setModelDraft({ ...modelDraft, status: e.target.checked ? 'active' : 'inactive' })}
                    />
                    <span>Active in inventory dropdowns</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="management-secondary compact"
                    onClick={() => {
                      setIsAddingModel(false);
                      setEditingModel(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="management-primary compact" disabled={modelSaving}>
                    {modelSaving ? 'Saving…' : editingModel ? 'Save Changes' : 'Add Model'} <Check size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* LIST OF MODELS */}
            <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
              {activeModels.map(model => {
                const yearSummary = model.years && model.years.length
                  ? model.years.length === ALL_YEARS.length
                    ? '2022–2026'
                    : `${Math.min(...model.years)}–${Math.max(...model.years)}`
                  : '2022–2026';

                return (
                  <div
                    key={model.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 14px',
                      background: model.status === 'active' ? '#ffffff' : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      opacity: model.status === 'active' ? 1 : 0.72
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: model.popular ? '#fef3c7' : '#f1f5f9',
                          color: model.popular ? '#d97706' : '#475569',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Car size={16} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{model.name}</strong>
                          {model.popular && (
                            <span style={{ fontSize: '10px', fontWeight: 750, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Star size={10} fill="currentColor" /> Top Pick
                            </span>
                          )}
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '1px 7px', borderRadius: '4px' }}>
                            {model.body || 'Car'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> Years: <strong>{yearSummary}</strong> ({model.years?.join(', ')})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* STATUS & ACTIONS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => void toggleModelStatus(model)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          background: model.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                          color: model.status === 'active' ? '#059669' : '#64748b'
                        }}
                        title="Toggle active status"
                      >
                        {model.status === 'active' ? 'Active' : 'Inactive'}
                      </button>

                      <button
                        type="button"
                        className="reset"
                        onClick={() => startEditModel(model)}
                        style={{ padding: '6px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                        title="Edit model"
                      >
                        <Pencil size={13} style={{ color: '#475569' }} />
                      </button>

                      <button
                        type="button"
                        className="suspend"
                        onClick={() => void deleteModel(model)}
                        style={{ padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        title="Delete model"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {!activeModels.length && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
                  <Car size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>No models matching your search</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                    {modelSearch ? 'Try a different search query or clear the filter.' : 'Click "+ Add Model" to add a new car model.'}
                  </p>
                </div>
              )}
            </div>

            <footer style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                {selectedMakeForModels.models?.length || 0} total models listed for {selectedMakeForModels.name} (2022–2026)
              </span>
              <button
                type="button"
                className="management-secondary"
                onClick={() => {
                  setSelectedMakeForModels(null);
                  setIsAddingModel(false);
                  setEditingModel(null);
                }}
              >
                Close Catalogue
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* CREATE / EDIT MAKE MODAL */}
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
