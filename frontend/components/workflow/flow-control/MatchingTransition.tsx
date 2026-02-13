'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type MatchingPhase = 'idle' | 'ready_prompt' | 'waiting' | 'matched' | 'grouped';

interface MatchingTransitionProps {
  phase: MatchingPhase;
  children: ReactNode;
}

export default function MatchingTransition({ phase, children }: MatchingTransitionProps) {
  const prevPhaseRef = useRef<MatchingPhase>(phase);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Vibrate on match success (mobile)
    if (
      (prevPhase === 'waiting' && (phase === 'matched' || phase === 'grouped'))
    ) {
      try {
        navigator.vibrate?.(200);
      } catch {
        // vibrate not supported
      }
    }
  }, [phase]);

  const animationClass = (() => {
    switch (phase) {
      case 'waiting':
        return 'animate-matching-pulse';
      case 'matched':
      case 'grouped':
        return 'animate-match-celebrate';
      default:
        return '';
    }
  })();

  return (
    <div className={animationClass}>
      {children}
    </div>
  );
}
