'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { Area } from '@/types/domain';

interface LocationSharingProps {
  areas: Area[];
  onUpdateLocation: (location: string, areaId: string | null) => Promise<void>;
  isUpdating: boolean;
  currentLocation?: string | null;
  currentAreaId?: string | null;
}

export default function LocationSharing({
  areas,
  onUpdateLocation,
  isUpdating,
  currentLocation,
  currentAreaId,
}: LocationSharingProps) {
  const { t } = useTranslation();
  const [location, setLocation] = useState(currentLocation || '');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(currentAreaId || null);

  const handleSubmit = async () => {
    if (!location.trim() && !selectedAreaId) return;
    const areaName = areas.find((a) => a.area_id === selectedAreaId)?.name;
    const finalLocation = location.trim() || areaName || '';
    if (!finalLocation) return;
    await onUpdateLocation(finalLocation, selectedAreaId);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground font-medium">
        {t('user.matchLocation.myLocation')}
      </label>
      {areas.length > 0 && (
        <select
          value={selectedAreaId || ''}
          onChange={(e) => setSelectedAreaId(e.target.value || null)}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={isUpdating}
        >
          <option value="">{t('locationFinding.selectArea')}</option>
          {areas.map((area) => (
            <option key={area.area_id} value={area.area_id}>
              {area.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t('user.matchLocation.locationPlaceholder')}
          maxLength={100}
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={isUpdating}
        />
        <button
          onClick={handleSubmit}
          disabled={(!location.trim() && !selectedAreaId) || isUpdating}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <MapPin className="w-4 h-4" />
          {isUpdating
            ? t('user.matchLocation.updating')
            : t('user.matchLocation.updateLocation')}
        </button>
      </div>
    </div>
  );
}
