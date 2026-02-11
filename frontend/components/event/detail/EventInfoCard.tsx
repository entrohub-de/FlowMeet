import { Calendar, Clock, MapPin } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { Event } from '@/types/domain';

interface EventInfoCardProps {
  event: Event;
  location: string;
}

function formatDateTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventInfoCard({ event, location }: EventInfoCardProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('host.events.details')}
        </h2>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground mb-1">
              {t('host.events.startTime')}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(event.start_time, locale)}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground mb-1">
              {t('host.events.endTime')}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(event.end_time, locale)}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground mb-1">
              {t('host.events.location')}
            </div>
            <div className="text-sm text-muted-foreground">{location}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
