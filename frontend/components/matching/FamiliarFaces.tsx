'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { getFamiliarFaces, type FamiliarFace } from '@/lib/api/matching';
import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

interface FamiliarFacesProps {
  eventId: string;
  userId: string;
}

export default function FamiliarFaces({ eventId, userId }: FamiliarFacesProps) {
  const { t } = useTranslation();
  const [faces, setFaces] = useState<FamiliarFace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !userId) return;
    getFamiliarFaces(eventId, userId)
      .then(setFaces)
      .catch(() => setFaces([]))
      .finally(() => setLoading(false));
  }, [eventId, userId]);

  if (loading || faces.length === 0) return null;

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t('familiarFaces.title')}
        </h3>
        <span className="text-xs text-muted-foreground">
          ({faces.length})
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('familiarFaces.hint')}
      </p>
      <div className="space-y-2">
        {faces.map((face) => (
          <div
            key={face.profile.user_id}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-lg bg-muted/50',
              'border border-transparent hover:border-primary/10 transition-colors'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
              {(face.profile.nickname ?? '?')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {face.profile.nickname ?? t('common.anonymous')}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t('familiarFaces.metAt', { event: face.previousEventName })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
