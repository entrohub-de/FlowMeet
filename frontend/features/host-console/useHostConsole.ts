import { useEffect, useState } from 'react';

interface HostConsoleState {
  isLoading: boolean;
  error: Error | null;
  data: any;
}

/**
 * Host Console 的 hook - 管理主持人控制台的状态
 */
export function useHostConsole(eventId: string) {
  const [state, setState] = useState<HostConsoleState>({
    isLoading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    if (!eventId) return;

    // TODO: 初始化主持人控制台的订阅
    setState((prev) => ({ ...prev, isLoading: false }));

    return () => {
      // 清理
    };
  }, [eventId]);

  return state;
}
