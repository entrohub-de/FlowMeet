'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import { Calendar, MapPin, Clock } from 'lucide-react';

const DEMO_EVENTS: Event[] = [
  {
    id: 'demo-1',
    title: 'FlowMeet 技术沙龙 · AI 与未来',
    description: '探讨人工智能在各行业的应用前景，邀请多位技术专家分享最新趋势与实践经验。适合对 AI 感兴趣的开发者、产品经理和创业者。',
    startTime: '2026-03-15T14:00:00',
    endTime: '2026-03-15T17:00:00',
    location: '上海市浦东新区张江高科技园区',
    createdBy: 'host-1',
    createdAt: '2026-02-01T10:00:00',
    updatedAt: '2026-02-01T10:00:00',
  },
  {
    id: 'demo-2',
    title: '创业者社交之夜',
    description: '一场轻松愉快的社交活动，连接不同背景的创业者，分享经验、寻找合作机会。提供茶歇和自由交流时间。',
    startTime: '2026-03-22T18:30:00',
    endTime: '2026-03-22T21:00:00',
    location: '北京市朝阳区 WeWork 社区空间',
    createdBy: 'host-2',
    createdAt: '2026-02-05T08:00:00',
    updatedAt: '2026-02-05T08:00:00',
  },
  {
    id: 'demo-3',
    title: 'Design Thinking Workshop',
    description: 'A hands-on workshop exploring design thinking methodologies. Learn how to apply creative problem-solving techniques to real-world challenges.',
    startTime: '2026-04-05T09:00:00',
    endTime: '2026-04-05T12:00:00',
    location: '深圳市南山区科技园创新中心',
    createdBy: 'host-3',
    createdAt: '2026-02-08T12:00:00',
    updatedAt: '2026-02-08T12:00:00',
  },
  {
    id: 'demo-4',
    title: '开源社区线下 Meetup',
    description: '聚集开源爱好者，分享开源项目经验，讨论社区建设与协作模式。欢迎带上你的项目来展示！',
    startTime: '2026-04-12T13:00:00',
    endTime: '2026-04-12T17:30:00',
    createdBy: 'host-1',
    createdAt: '2026-02-09T09:00:00',
    updatedAt: '2026-02-09T09:00:00',
  },
];

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

function EventCard({ event, locale, t }: { event: Event; locale: string; t: (key: string) => string }) {
  const [signingUp, setSigningUp] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const handleSignup = async () => {
    setSigningUp(true);
    // TODO: call actual signup API
    await new Promise((r) => setTimeout(r, 600));
    setSignedUp(true);
    setSigningUp(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 hover:shadow-md transition-shadow space-y-4">
      {/* Title & Description */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground leading-tight">
          {event.title}
        </h3>
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {event.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 shrink-0 text-primary" />
          <span>{formatDateTime(event.startTime, locale)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-primary" />
          <span>{formatDateTime(event.endTime, locale)}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0 text-primary" />
          <span>{event.location || t('user.locationTbd')}</span>
        </div>
      </div>

      {/* Sign Up Button */}
      <button
        onClick={handleSignup}
        disabled={signingUp || signedUp}
        className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          signedUp
            ? 'bg-muted text-muted-foreground cursor-default'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {signingUp
          ? '...'
          : signedUp
            ? t('user.signedUp')
            : t('user.signupBtn')}
      </button>
    </div>
  );
}

export default function SignupPage() {
  const { t, locale } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then((data) => setEvents(data.length > 0 ? data : DEMO_EVENTS))
      .catch(() => setEvents(DEMO_EVENTS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
          {t('user.signup')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('user.signupDesc')}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-lg font-medium text-foreground">{t('user.noEvents')}</p>
          <p className="text-sm text-muted-foreground">{t('user.noEventsDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
