'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Users, Loader2, UserCheck, Heart } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useFlowMatching } from '@/hooks/useFlowMatching';
import { updateMatchLocation } from '@/lib/api/matching';
import { getEventVenueAreas } from '@/lib/api/venues';
import { supabase } from '@/lib/supabase/client';
import LocationSharing from '@/components/matching/LocationSharing';
import PartnerLocationCard from '@/components/matching/PartnerLocationCard';
import MatchingTransition from '@/components/workflow/flow-control/MatchingTransition';
import PostMatchFeedback from '@/components/workflow/flow-control/PostMatchFeedback';
import type { Area } from '@/types/domain';

type FlowStatus = 'pending' | 'active' | 'paused' | 'completed';

interface MatchingStepCardProps {
  index: number;
  stepId: string;
  title: string;
  status: FlowStatus;
  remainingSeconds: number;
  formatTime: (totalSeconds: number) => string;
  eventId: string;
}

export default function MatchingStepCard({
  index,
  stepId,
  title,
  status,
  remainingSeconds,
  formatTime,
  eventId,
}: MatchingStepCardProps) {
  const { t } = useTranslation();
  const { state, toggleReady } = useFlowMatching(eventId, stepId, status, '1v1');

  const [areas, setAreas] = useState<Area[]>([]);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUser1, setIsUser1] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  // Get current user ID for feedback
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  // Load venue areas for area selection
  useEffect(() => {
    if (!eventId) return;
    getEventVenueAreas(eventId).then(setAreas);
  }, [eventId]);

  // Determine if current user is user1 in the match
  useEffect(() => {
    if (!state.partner?.matchId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from('evt_matches')
        .select('user1_id')
        .eq('match_id', state.partner!.matchId)
        .single()
        .then(({ data }) => {
          if (data) setIsUser1(data.user1_id === session.user.id);
        });
    });
  }, [state.partner?.matchId, state.partner]);

  const handleUpdateLocation = useCallback(async (location: string, areaId: string | null) => {
    if (!state.partner?.matchId) return;
    setIsUpdatingLocation(true);
    try {
      await updateMatchLocation(state.partner.matchId, location, areaId);
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setIsUpdatingLocation(false);
    }
  }, [state.partner?.matchId]);

  return (
    <div className="rounded-xl border-2 border-primary bg-primary/5 overflow-hidden">
      {/* Step header */}
      <div className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold bg-primary text-white">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{title}</span>
            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
              1v1
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span
              className={`font-mono font-semibold ${
                remainingSeconds <= 0
                  ? 'text-red-500'
                  : status === 'paused'
                    ? 'text-amber-600'
                    : 'text-primary'
              }`}
            >
              {formatTime(remainingSeconds)}
            </span>
            {status === 'active' && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                {t('host.flowControl.inProgress')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Matching content with transition animations */}
      <div className="px-4 pb-4">
        <MatchingTransition phase={state.phase}>
          {/* Phase: Ready prompt */}
          {state.phase === 'ready_prompt' && (
            <div className="bg-background rounded-lg p-6 text-center space-y-4">
              <Users className="w-12 h-12 mx-auto text-primary/60" />
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  {t('flowMatching.readyToMatch')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('ux.matching.readyCount', {
                    count: state.readyCount,
                  })}
                </p>
              </div>
              <button
                onClick={toggleReady}
                className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-lg hover:bg-primary/90 transition-colors touch-target touch-feedback"
              >
                {t('flowMatching.readyButton')}
              </button>
            </div>
          )}

          {/* Phase: Waiting */}
          {state.phase === 'waiting' && (
            <div className="bg-background rounded-lg p-6 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary animate-breathing" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  {t('ux.matching.waitingAnimation')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('ux.matching.readyCount', {
                    count: state.readyCount,
                  })}
                </p>
              </div>
              <button
                onClick={toggleReady}
                className="px-4 py-2 border border-border text-muted-foreground rounded-lg text-sm hover:bg-muted transition-colors touch-target touch-feedback"
              >
                {t('flowMatching.cancelReady')}
              </button>
              {state.isUnpaired && (
                <div className="flex items-center gap-2 justify-center text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
                  <Heart className="w-4 h-4 shrink-0" />
                  <p>{t('ux.matching.unpaired')}</p>
                </div>
              )}
            </div>
          )}

          {/* Phase: Matched */}
          {state.phase === 'matched' && state.partner && (
            <div className="bg-background rounded-lg p-5 space-y-4 animate-slide-up-fade">
              <div className="flex items-center gap-2 text-primary font-medium">
                <UserCheck className="w-5 h-5" />
                {t('flowMatching.matchFound')}
              </div>

              {/* Partner info - larger avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20">
                  <span className="text-2xl font-semibold text-primary">
                    {state.partner.profile?.nickname?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {state.partner.profile?.nickname || t('user.anonymous')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {state.partner.profile?.gender || ''}{' '}
                    {state.partner.profile?.age_group || ''}
                  </p>
                </div>
              </div>

              {/* Partner location (real-time) - more prominent */}
              <div className="pt-3 border-t border-border space-y-3">
                <PartnerLocationCard
                  matchId={state.partner.matchId}
                  isUser1={isUser1}
                  areas={areas}
                />
                <LocationSharing
                  areas={areas}
                  onUpdateLocation={handleUpdateLocation}
                  isUpdating={isUpdatingLocation}
                />
              </div>
            </div>
          )}

          {/* Phase: idle (shouldn't normally show, but fallback) */}
          {state.phase === 'idle' && (
            <div className="bg-background rounded-lg p-4 text-center text-muted-foreground text-sm">
              {t('flowMatching.waitingToStart')}
            </div>
          )}
        </MatchingTransition>

        {/* Post-match feedback (Workstream D): shown when step is completed and user was matched */}
        {status === 'completed' && state.partner && currentUserId && !feedbackDismissed && (
          <PostMatchFeedback
            matchId={state.partner.matchId}
            userId={currentUserId}
            onDismiss={() => setFeedbackDismissed(true)}
          />
        )}
      </div>
    </div>
  );
}
