'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getVenues, createVenue, updateVenue, deleteVenue, getVenueAreas, createArea, updateArea, deleteArea } from '@/lib/api/venues';
import type { Venue, Area, AreaType } from '@/types/domain';

const AREA_TYPES: AreaType[] = ['meeting_room', 'lounge', 'cafe', 'stage', 'general'];

export default function HostVenuesPage() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit venue dialog
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Area management
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(null);
  const [venueAreas, setVenueAreas] = useState<Map<string, Area[]>>(new Map());
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaType, setAreaType] = useState<AreaType>('general');
  const [areaMaxPeople, setAreaMaxPeople] = useState('');
  const [areaMinPeople, setAreaMinPeople] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [savingArea, setSavingArea] = useState(false);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    const data = await getVenues();
    setVenues(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadVenues(); }, [loadVenues]);

  const loadAreas = async (venueId: string) => {
    const areas = await getVenueAreas(venueId);
    setVenueAreas((prev) => new Map(prev).set(venueId, areas));
  };

  const toggleExpand = (venueId: string) => {
    if (expandedVenueId === venueId) {
      setExpandedVenueId(null);
    } else {
      setExpandedVenueId(venueId);
      if (!venueAreas.has(venueId)) {
        loadAreas(venueId);
      }
    }
  };

  const openCreateVenue = () => {
    setEditingVenue(null);
    setFormName('');
    setFormCapacity('');
    setFormAddress('');
    setFormDescription('');
    setShowForm(true);
  };

  const openEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setFormName(venue.name);
    setFormCapacity(String(venue.capacity));
    setFormAddress(venue.address ?? '');
    setFormDescription(venue.description ?? '');
    setShowForm(true);
  };

  const handleSaveVenue = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingVenue) {
        await updateVenue(editingVenue.venue_id, {
          name: formName.trim(),
          capacity: parseInt(formCapacity) || 0,
          address: formAddress.trim() || null,
          description: formDescription.trim() || null,
        });
      } else {
        await createVenue({
          name: formName.trim(),
          capacity: parseInt(formCapacity) || 0,
          address: formAddress.trim() || undefined,
          description: formDescription.trim() || undefined,
        });
      }
      setShowForm(false);
      loadVenues();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!confirm(t('venue.deleteConfirm'))) return;
    await deleteVenue(venueId);
    loadVenues();
  };

  const openCreateArea = (_venueId: string) => {
    setEditingArea(null);
    setAreaName('');
    setAreaType('general');
    setAreaMaxPeople('');
    setAreaMinPeople('');
    setAreaDescription('');
    setShowAreaForm(true);
  };

  const openEditArea = (area: Area) => {
    setEditingArea(area);
    setAreaName(area.name);
    setAreaType(area.area_type as AreaType);
    setAreaMaxPeople(String(area.max_people));
    setAreaMinPeople(String(area.min_people));
    setAreaDescription(area.description ?? '');
    setShowAreaForm(true);
  };

  const handleSaveArea = async () => {
    if (!areaName.trim() || !expandedVenueId) return;
    setSavingArea(true);
    try {
      if (editingArea) {
        await updateArea(editingArea.area_id, {
          name: areaName.trim(),
          area_type: areaType,
          max_people: parseInt(areaMaxPeople) || 0,
          min_people: parseInt(areaMinPeople) || 0,
          description: areaDescription.trim() || null,
        });
      } else {
        await createArea({
          event_id: expandedVenueId,
          name: areaName.trim(),
          area_type: areaType,
          max_people: parseInt(areaMaxPeople) || 0,
          min_people: parseInt(areaMinPeople) || 0,
          description: areaDescription.trim() || undefined,
        });
      }
      setShowAreaForm(false);
      loadAreas(expandedVenueId);
    } finally {
      setSavingArea(false);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!expandedVenueId) return;
    await deleteArea(areaId);
    loadAreas(expandedVenueId);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
              {t('venue.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('venue.subtitle')}
            </p>
          </div>
          <button
            onClick={openCreateVenue}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('venue.createVenue')}
          </button>
        </div>

        {/* Venue list */}
        {venues.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">{t('venue.noVenues')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {venues.map((venue) => (
              <div key={venue.venue_id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Venue card */}
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{venue.name}</h3>
                      {venue.address && (
                        <p className="text-sm text-muted-foreground">{venue.address}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{t('venue.capacity')}: {venue.capacity}</span>
                        {venue.description && (
                          <span className="truncate max-w-[200px]">{venue.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditVenue(venue)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(venue.venue_id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(venue.venue_id)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedVenueId === venue.venue_id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Areas section */}
                {expandedVenueId === venue.venue_id && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-foreground">{t('venue.areas')}</h4>
                      <button
                        onClick={() => openCreateArea(venue.venue_id)}
                        className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t('venue.createArea')}
                      </button>
                    </div>

                    {(venueAreas.get(venue.venue_id) ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t('venue.noAreas')}</p>
                    ) : (
                      <div className="space-y-2">
                        {(venueAreas.get(venue.venue_id) ?? []).map((area) => (
                          <div key={area.area_id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground">{area.name}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                                  {t(`venue.areaTypes.${area.area_type}`)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {area.min_people}-{area.max_people} {t('venue.people')}
                                {area.description && ` · ${area.description}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditArea(area)} className="p-1 text-muted-foreground hover:text-foreground">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteArea(area.area_id)} className="p-1 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Venue form dialog */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {editingVenue ? t('venue.editVenue') : t('venue.createVenue')}
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('venue.name')}
                  autoFocus
                />
                <input
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder={t('venue.address')}
                />
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  placeholder={t('venue.capacity')}
                />
                <textarea
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('venue.description')}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveVenue}
                  disabled={saving || !formName.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? t('profile.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Area form dialog */}
        {showAreaForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {editingArea ? t('venue.editArea') : t('venue.createArea')}
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder={t('venue.areaName')}
                  autoFocus
                />
                <select
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={areaType}
                  onChange={(e) => setAreaType(e.target.value as AreaType)}
                >
                  {AREA_TYPES.map((type) => (
                    <option key={type} value={type}>{t(`venue.areaTypes.${type}`)}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={areaMinPeople}
                    onChange={(e) => setAreaMinPeople(e.target.value)}
                    placeholder={t('venue.minPeople')}
                  />
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={areaMaxPeople}
                    onChange={(e) => setAreaMaxPeople(e.target.value)}
                    placeholder={t('venue.maxPeople')}
                  />
                </div>
                <textarea
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2}
                  value={areaDescription}
                  onChange={(e) => setAreaDescription(e.target.value)}
                  placeholder={t('venue.description')}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAreaForm(false)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveArea}
                  disabled={savingArea || !areaName.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingArea ? t('profile.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
