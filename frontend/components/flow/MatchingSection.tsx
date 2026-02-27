'use client';

import { Users } from 'lucide-react';
import type { useFlowMatching } from '@/hooks/useFlowMatching';

interface MatchingSectionProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  matchingState: ReturnType<typeof useFlowMatching>['state'];
  goReady: () => void;
  cancelReady: () => void;
  finishChat: () => void;
  rejoin: () => void;
}

export function MatchingSection({ t, matchingState, goReady, cancelReady, finishChat, rejoin }: MatchingSectionProps) {
  return (
    <div className="bg-card rounded-2xl border border-primary/20 p-5 space-y-4">
      <h3 className="font-semibold">{t('userFlow.matchingOpen')}</h3>

      {matchingState.phase === 'ready' && (
        <button
          onClick={goReady}
          className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity touch-feedback"
        >
          {t('userFlow.joinMatching')}
        </button>
      )}

      {matchingState.phase === 'matching' && (
        <div className="text-center space-y-2">
          <div className="animate-pulse text-primary">
            <Users className="w-8 h-8 mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground">{t('userFlow.waitingForMatch')}</p>
          <p className="text-xs text-muted-foreground">
            {matchingState.readyCount} {t('userFlow.peopleWaiting')}
          </p>
          <button
            onClick={cancelReady}
            className="mt-2 px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
          >
            {t('userFlow.cancelReady')}
          </button>
        </div>
      )}

      {matchingState.phase === 'chatting' && matchingState.partner && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            {matchingState.partner.profile?.avatar_url ? (
              <img
                src={matchingState.partner.profile.avatar_url}
                alt=""
                className="w-16 h-16 mx-auto rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {(matchingState.partner.profile?.nickname ?? '?')[0]}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {matchingState.partner.profile?.nickname || t('userFlow.anonymous')}
            </p>
          </div>
          <button
            onClick={finishChat}
            className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity touch-feedback"
          >
            {t('userFlow.finishRound')}
          </button>
        </div>
      )}

      {matchingState.phase === 'left' && (
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">{t('userFlow.leftHint')}</p>
          <button
            onClick={rejoin}
            className="px-6 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
          >
            {t('userFlow.rejoin')}
          </button>
        </div>
      )}
    </div>
  );
}
