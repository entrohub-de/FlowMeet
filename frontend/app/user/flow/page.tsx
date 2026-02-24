'use client';

import { PauseCircle, Users, LogOut, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import { useFlowMatching } from '@/hooks/useFlowMatching';

export default function UserFlowPage() {
  const { t } = useTranslation();

  const {
    loading,
    selectedEventId,
    flowState,
    isGloballyPaused,
    globalPauseMessage,
  } = useActiveFlow();

  const permissions = flowState?.permissions ?? null;
  const matching1v1Enabled = permissions?.matching_1v1_enabled ?? false;

  const { state: matchingState, goReady, cancelReady, finishChat, leave, rejoin } = useFlowMatching(
    selectedEventId,
    '1v1',
    matching1v1Enabled
  );

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

      {isGloballyPaused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <PauseCircle className="w-16 h-16 text-white mb-4" />
          <p className="text-xl font-semibold text-white">
            {globalPauseMessage || t('globalPause.paused')}
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto relative">
        {matching1v1Enabled ? (
          <div className="bg-card rounded-2xl border border-primary/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{t('userFlow.matchingOpen')}</h3>
              </div>
              {matchingState.phase !== 'left' && (
                <button
                  onClick={leave}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  title={t('userFlow.leave')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 准备 */}
            {matchingState.phase === 'ready' && (
              <button
                onClick={goReady}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity touch-feedback"
              >
                {t('userFlow.joinMatching')}
              </button>
            )}

            {/* 匹配中 */}
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
                  className="text-xs text-muted-foreground underline"
                >
                  {t('userFlow.cancelReady')}
                </button>
              </div>
            )}

            {/* 对话中 */}
            {matchingState.phase === 'chatting' && matchingState.partner && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-lg font-semibold">{t('userFlow.chatting')}</p>
                  <p className="text-sm text-muted-foreground">
                    {matchingState.partner.profile?.nickname || t('userFlow.anonymous')}
                  </p>
                </div>
                <button
                  onClick={finishChat}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity touch-feedback"
                >
                  {t('userFlow.finishRound')}
                </button>
              </div>
            )}

            {/* 已离开 */}
            {matchingState.phase === 'left' && (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">{t('userFlow.leftHint')}</p>
                <button
                  onClick={rejoin}
                  className="px-6 py-2 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  {t('userFlow.rejoin')}
                </button>
              </div>
            )}
          </div>
        ) : (
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
