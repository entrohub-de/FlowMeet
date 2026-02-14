import { Users, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { Signup } from '@/types/domain';

interface ParticipantsCardProps {
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

export default function ParticipantsCard({ signups }: ParticipantsCardProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('host.events.participantsList')}
        </h2>
      </div>

      {signups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('host.events.noSignups')}
        </div>
      ) : (
        <div className="space-y-2">
          {signups.map((signup, index) => (
            <div
              key={signup.signup_id}
              className="bg-muted/30 hover:bg-muted/50 rounded-lg p-4 transition-colors border border-transparent hover:border-primary/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {signup.profile?.avatar_url ? (
                    <img
                      src={signup.profile.avatar_url}
                      alt={signup.profile?.nickname || ''}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {signup.profile?.nickname?.[0]?.toUpperCase() || (index + 1)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {signup.profile?.nickname || t('user.anonymous')}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      {signup.profile?.gender && (
                        <span className="px-2 py-0.5 bg-muted rounded text-xs">
                          {signup.profile.gender}
                        </span>
                      )}
                      {signup.profile?.age_group && (
                        <span className="px-2 py-0.5 bg-muted rounded text-xs">
                          {signup.profile.age_group}
                        </span>
                      )}
                      <span className="text-xs">
                        {formatDate(signup.created_at, locale)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {signup.expectation?.content ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <MessageSquare className="w-3 h-3" />
                      {t('common.yes')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                      {t('common.no')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
