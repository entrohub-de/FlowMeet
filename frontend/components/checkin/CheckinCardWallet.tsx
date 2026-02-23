'use client';

import { useRef, useState, useCallback } from 'react';
import { EventCheckinCard } from '@/components/checkin/EventCheckinCard';
import type { Event } from '@/types/domain';

interface CheckinCardWalletProps {
  events: Event[];
  userId: string;
  checkedInMap: Map<string, boolean>;
}

export default function CheckinCardWallet({ events, userId, checkedInMap }: CheckinCardWalletProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 1;
    const idx = Math.round(el.scrollLeft / (cardWidth + 16));
    setActiveIndex(Math.min(idx, events.length - 1));
  }, [events.length]);

  if (events.length === 0) return null;

  if (events.length === 1) {
    return (
      <EventCheckinCard
        event={events[0]}
        userId={userId}
        isCheckedIn={checkedInMap.get(events[0].event_id) || false}
      />
    );
  }

  return (
    <div>
      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-3"
      >
        {events.map((evt) => (
          <div
            key={evt.event_id}
            className="snap-center min-w-[85vw] max-w-sm flex-shrink-0"
          >
            <EventCheckinCard
              event={evt}
              userId={userId}
              isCheckedIn={checkedInMap.get(evt.event_id) || false}
            />
          </div>
        ))}
      </div>

      {/* Dot indicator */}
      {events.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {events.map((evt, i) => (
            <span
              key={evt.event_id}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === activeIndex ? 'bg-primary' : 'bg-primary/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
