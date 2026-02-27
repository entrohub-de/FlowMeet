'use client';

import { Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/features/auth/useAuth';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import { useFlowMatching } from '@/hooks/useFlowMatching';
import { useGroupIdentity } from '@/hooks/useGroupIdentity';
import { usePresenceTracker } from '@/hooks/usePresenceTracker';
import { IdentitySection } from '@/components/flow/IdentitySection';
import { MatchingSection } from '@/components/flow/MatchingSection';
import { MixedGroupSection } from '@/components/flow/MixedGroupSection';

export default function UserFlowPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { loading, selectedEventId, flowState } = useActiveFlow();

  const permissions = flowState?.permissions ?? null;
  const matching1v1Enabled = permissions?.matching_1v1_enabled ?? false;
  const groupEnabled = permissions?.matching_group_enabled ?? false;
  const mixedGroupEnabled = permissions?.matching_mixed_group_enabled ?? false;

  const { state: matchingState, goReady, cancelReady, finishChat, rejoin } = useFlowMatching(
    selectedEventId,
    '1v1',
    matching1v1Enabled
  );

  const { state: identityState, setIdentity } = useGroupIdentity(
    selectedEventId,
    groupEnabled
  );

  usePresenceTracker(
    selectedEventId,
    groupEnabled || mixedGroupEnabled,
    matching1v1Enabled
  );

  const anyFeatureEnabled = matching1v1Enabled || groupEnabled || mixedGroupEnabled;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30 relative">
      <div className="pointer-events-none absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[100px]" />

      <div className="max-w-4xl mx-auto relative space-y-4">
        {groupEnabled && (
          <IdentitySection t={t} state={identityState} onSelect={setIdentity} />
        )}

        {matching1v1Enabled && (
          <MatchingSection
            t={t}
            matchingState={matchingState}
            goReady={goReady}
            cancelReady={cancelReady}
            finishChat={finishChat}
            rejoin={rejoin}
          />
        )}

        {mixedGroupEnabled && (
          <MixedGroupSection t={t} eventId={selectedEventId} userId={user?.id} />
        )}

        {!anyFeatureEnabled && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Users className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-muted-foreground font-medium">{t('userFlow.noActiveFlow')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('userFlow.waitingHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
