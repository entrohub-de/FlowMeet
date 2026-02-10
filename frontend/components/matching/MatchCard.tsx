import { useState, useEffect } from 'react';
import { Check, X, MessageSquare, MapPin } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { Match, Profile } from '@/types/domain';
import { updateMatchLocation } from '@/lib/api/matching';
import { supabase } from '@/lib/supabase/client';

interface MatchCardProps {
  match: Match;
  partner: Profile | undefined;
  isPending: boolean;
  onAccept: (matchId: string) => void;
  onDecline: (matchId: string) => void;
  onComplete: (matchId: string) => void;
}

export function MatchCard({
  match,
  partner,
  isPending,
  onAccept,
  onDecline,
  onComplete,
}: MatchCardProps) {
  const { t } = useTranslation();
  const [myLocation, setMyLocation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 获取当前用户ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // 确定哪个是我的位置，哪个是对方的位置
  const isUser1 = currentUserId === match.user1_id;
  const partnerLocation = isUser1 ? match.user2_location : match.user1_location;
  const partnerLocationUpdatedAt = isUser1
    ? match.location_updated_by_user2_at
    : match.location_updated_by_user1_at;

  // 格式化时间显示
  const formatUpdateTime = (timestamp: string | null): string => {
    if (!timestamp) return '';

    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now.getTime() - updated.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return t('user.matchLocation.justNow');
    if (diffMinutes < 60) return t('user.matchLocation.minutesAgo').replace('{n}', String(diffMinutes));
    if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return t('user.matchLocation.hoursAgo').replace('{n}', String(hours));
    }
    return updated.toLocaleString();
  };

  const handleUpdateLocation = async () => {
    if (!myLocation.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const success = await updateMatchLocation(match.match_id, myLocation.trim());
      if (success) {
        // 成功后可以显示提示或刷新数据
        setMyLocation('');
      } else {
        alert(t('user.matchLocation.locationUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert(t('user.matchLocation.locationUpdateFailed'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {partner?.nickname?.[0] || '?'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {partner?.nickname || t('user.anonymous')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {partner?.gender || ''} {partner?.age_group || ''}
              </p>
            </div>
          </div>

          <div className="ml-15">
            <span
              className={`inline-block text-xs px-2 py-1 rounded-full border ${
                match.status === 'accepted'
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : match.status === 'pending'
                    ? 'bg-accent/20 text-accent border-accent/40'
                    : match.status === 'completed'
                      ? 'bg-muted text-muted-foreground border-border'
                      : 'bg-muted/50 text-muted-foreground border-border'
              }`}
            >
              {t(`user.matchStatus.${match.status}`)}
            </span>
          </div>

          {/* Location Section - Only show for accepted matches */}
          {match.status === 'accepted' && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {/* Partner's Location */}
              {partnerLocation && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-muted-foreground text-xs mb-1">
                      {t('user.matchLocation.partnerLocation')}
                    </p>
                    <p className="text-foreground font-medium">{partnerLocation}</p>
                    {partnerLocationUpdatedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatUpdateTime(partnerLocationUpdatedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* My Location Input */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {t('user.matchLocation.myLocation')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={myLocation}
                    onChange={(e) => setMyLocation(e.target.value)}
                    placeholder={t('user.matchLocation.locationPlaceholder')}
                    maxLength={100}
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={isUpdating}
                  />
                  <button
                    onClick={handleUpdateLocation}
                    disabled={!myLocation.trim() || isUpdating}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? t('user.matchLocation.updating') : t('user.matchLocation.updateLocation')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {isPending && (
            <>
              <button
                onClick={() => onAccept(match.match_id)}
                className="px-button h-button bg-primary text-primary-foreground rounded-button hover:bg-primary/90 transition-colors flex items-center justify-center"
                title={t('user.accept')}
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDecline(match.match_id)}
                className="px-button h-button bg-destructive text-destructive-foreground rounded-button hover:bg-destructive/90 transition-colors flex items-center justify-center"
                title={t('user.decline')}
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
          {match.status === 'accepted' && (
            <button
              onClick={() => onComplete(match.match_id)}
              className="px-button h-button bg-primary text-primary-foreground rounded-button hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('user.markCompleted')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
