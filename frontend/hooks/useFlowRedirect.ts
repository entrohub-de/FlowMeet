'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { subscribeToFlow, type FlowBroadcastPayload } from '@/lib/realtime/flow-broadcast';
import { getUserSignups } from '@/lib/api/signup';
import { getEvents } from '@/lib/api/events';

/**
 * 全局 hook：当主持人启动活动流程时，自动引导参与者跳转到 /user/flow
 * 应挂载在 user layout 中，覆盖所有用户页面
 */
export function useFlowRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;

    let cancelled = false;
    const channels: ReturnType<typeof subscribeToFlow>[] = [];

    const setup = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Get events the user signed up for
        const [signupMap, events] = await Promise.all([
          getUserSignups(user.id),
          getEvents(),
        ]);

        if (cancelled) return;

        // Subscribe to flow broadcasts for each signed-up event
        const signedUpEventIds = events
          .filter(e => signupMap.has(e.event_id))
          .map(e => e.event_id);

        for (const eventId of signedUpEventIds) {
          const channel = subscribeToFlow(eventId, {
            onFlowApplied: (payload: FlowBroadcastPayload) => {
              if (payload.flowStatus === 'running') {
                navigateToFlow();
              }
            },
            onStepChanged: (payload: FlowBroadcastPayload) => {
              // When first step is activated (flow effectively starts)
              if (payload.flowStatus === 'running' && payload.activeStepId) {
                navigateToFlow();
              }
            },
          });
          channels.push(channel);
        }

        subscribedRef.current = true;
      } catch (error) {
        console.error('[useFlowRedirect] Setup failed:', error);
      }
    };

    const navigateToFlow = () => {
      // Only redirect if user is NOT already on the flow page
      if (!pathname.startsWith('/user/flow')) {
        router.push('/user/flow');
      }
    };

    setup();

    return () => {
      cancelled = true;
      channels.forEach(ch => ch.unsubscribe());
      subscribedRef.current = false;
    };
  }, [router, pathname]);
}
