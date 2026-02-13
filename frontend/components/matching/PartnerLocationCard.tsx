'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { subscribeToMatchLocation } from '@/lib/api/matching';
import type { Area } from '@/types/domain';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PartnerLocationCardProps {
  matchId: string;
  isUser1: boolean;
  areas: Area[];
}

function formatUpdateTime(isoString: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return t('user.matchLocation.justNow');
  const mins = Math.floor(diff / 60);
  if (mins < 60) return t('user.matchLocation.minutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  return t('user.matchLocation.hoursAgo', { n: hours });
}

export default function PartnerLocationCard({
  matchId,
  isUser1,
  areas,
}: PartnerLocationCardProps) {
  const { t } = useTranslation();
  const [partnerLocation, setPartnerLocation] = useState<string | null>(null);
  const [partnerAreaId, setPartnerAreaId] = useState<string | null>(null);
  const [partnerUpdatedAt, setPartnerUpdatedAt] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!matchId) return;

    const channel = subscribeToMatchLocation(matchId, (data) => {
      if (isUser1) {
        setPartnerLocation(data.user2_location);
        setPartnerAreaId(data.user2_area_id);
        setPartnerUpdatedAt(data.location_updated_by_user2_at);
      } else {
        setPartnerLocation(data.user1_location);
        setPartnerAreaId(data.user1_area_id);
        setPartnerUpdatedAt(data.location_updated_by_user1_at);
      }
    });
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [matchId, isUser1]);

  // Refresh relative time every 30 seconds
  useEffect(() => {
    if (!partnerUpdatedAt) return;
    const interval = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, [partnerUpdatedAt]);

  const areaName = areas.find((a) => a.area_id === partnerAreaId)?.name;

  if (!partnerLocation && !areaName) {
    return (
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <p>{t('user.matchLocation.noLocation')}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-sm">
      <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">
          {t('user.matchLocation.partnerLocation')}
        </p>
        {areaName && (
          <p className="text-foreground font-medium">{areaName}</p>
        )}
        {partnerLocation && (
          <p className="text-foreground">{partnerLocation}</p>
        )}
        {partnerUpdatedAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('user.matchLocation.updatedAt', {
              time: formatUpdateTime(partnerUpdatedAt, t),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
