'use client';

import { MessageSquare } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { Signup } from '@/types/domain';

interface ExpectationsCardProps {
  signups: Signup[];
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ExpectationsCard({ signups }: ExpectationsCardProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('host.events.participantExpectations')}
        </h2>
      </div>

      <div className="space-y-3">
        {signups.map((signup) => (
          <div
            key={signup.signup_id}
            className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {signup.profile?.nickname || t('user.anonymous')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(signup.created_at, locale)}
                </div>
              </div>
              {signup.profile && (
                <div className="flex gap-1">
                  {signup.profile.gender && (
                    <span className="px-2 py-0.5 bg-background rounded text-xs text-muted-foreground">
                      {signup.profile.gender}
                    </span>
                  )}
                  {signup.profile.age_group && (
                    <span className="px-2 py-0.5 bg-background rounded text-xs text-muted-foreground">
                      {signup.profile.age_group}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-background/80 rounded-lg p-3 border border-border/50">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {signup.expectation?.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
