'use client';

import { useState, useEffect } from 'react';
import { MapPin, Building2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import { supabase } from '@/lib/supabase/client';
import type { Venue, Area } from '@/types/domain';

export default function VenuePage() {
  const { t } = useTranslation();
  const { selectedEventId, loading: flowLoading } = useActiveFlow();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedEventId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        // Get event with venue
        const { data: event } = await supabase
          .from('evt_events')
          .select('venue_id, venue:evt_venues(*)')
          .eq('event_id', selectedEventId)
          .maybeSingle();

        if (event?.venue) {
          const v = event.venue as unknown as Venue;
          setVenue(v);

          // Get areas for this venue
          const { data: areasData } = await supabase
            .from('evt_areas')
            .select('*')
            .eq('event_id', v.venue_id)
            .order('area_order', { ascending: true });

          setAreas((areasData as Area[]) ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedEventId]);

  if (flowLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('user.venue')}</h1>
        </div>

        {!venue ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('venue.noVenueForEvent')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Venue info */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h2 className="text-xl font-semibold text-foreground">{venue.name}</h2>
              {venue.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{venue.address}</span>
                </div>
              )}
              {venue.description && (
                <p className="text-sm text-muted-foreground">{venue.description}</p>
              )}
              <div className="text-xs text-muted-foreground">
                {t('venue.capacity')}: {venue.capacity}
              </div>
            </div>

            {/* Areas */}
            {areas.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                <h3 className="font-semibold text-foreground">{t('venue.areas')}</h3>
                <div className="space-y-2">
                  {areas.map((area) => (
                    <div key={area.area_id} className="bg-muted/30 border border-border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{area.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                          {t(`venue.areaTypes.${area.area_type}`)}
                        </span>
                      </div>
                      {area.description && (
                        <p className="text-xs text-muted-foreground mt-1">{area.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
