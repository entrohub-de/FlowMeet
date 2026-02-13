import { supabase } from '@/lib/supabase/client';
import { CHANNEL_NAMES } from './subscribe';
import type { ActiveFlowStep } from '@/types/domain';

export interface FlowBroadcastPayload {
  flowStatus: string;
  steps: ActiveFlowStep[];
  activeStepId: string | null;
  activeStepStartedAt: string | null;
  activeStepRemainingSeconds: number | null;
  templateId?: string;
  templateName?: string;
  startedAt?: string;
  changedStepId?: string;
  changedStepNewStatus?: string;
  timestamp: string;
}

/**
 * Host: 广播流程状态变更
 */
export function broadcastFlowUpdate(
  eventId: string,
  event: 'flow_applied' | 'step_changed' | 'flow_reset',
  payload: FlowBroadcastPayload
) {
  const channel = supabase.channel(CHANNEL_NAMES.flow(eventId));
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event,
        payload,
      });
      // 发送后短暂延迟再取消订阅，确保消息发出
      setTimeout(() => supabase.removeChannel(channel), 500);
    }
  });
}

/**
 * 参与者: 订阅流程状态变更
 */
export function subscribeToFlow(
  eventId: string,
  callbacks: {
    onFlowApplied?: (payload: FlowBroadcastPayload) => void;
    onStepChanged?: (payload: FlowBroadcastPayload) => void;
    onFlowReset?: () => void;
  }
) {
  const channel = supabase
    .channel(CHANNEL_NAMES.flow(eventId))
    .on('broadcast', { event: 'flow_applied' }, ({ payload }) => {
      callbacks.onFlowApplied?.(payload as FlowBroadcastPayload);
    })
    .on('broadcast', { event: 'step_changed' }, ({ payload }) => {
      callbacks.onStepChanged?.(payload as FlowBroadcastPayload);
    })
    .on('broadcast', { event: 'flow_reset' }, () => {
      callbacks.onFlowReset?.();
    })
    .subscribe();

  return channel;
}
