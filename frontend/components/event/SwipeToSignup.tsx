'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SwipeToSignupProps {
  label: string;
  onSwipeComplete: () => Promise<void> | void;
  disabled?: boolean;
  completedLabel?: string;
}

const THUMB_SIZE = 64;
const COMPLETE_THRESHOLD = 0.85;
const DAMPING = 0.7; // < 1 = heavier feel

export default function SwipeToSignup({ label, onSwipeComplete, disabled, completedLabel }: SwipeToSignupProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const trackWidthRef = useRef(0);
  const offsetXRef = useRef(0);
  const completedRef = useRef(false);
  const hapticFiredRef = useRef(false);

  const maxOffset = useCallback(() => {
    return trackWidthRef.current - THUMB_SIZE;
  }, []);

  const fireConfetti = useCallback(() => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) {
      confetti({ particleCount: 100, spread: 70 });
      return;
    }
    const x = (rect.left + rect.width) / window.innerWidth;
    const y = rect.top / window.innerHeight;
    confetti({
      particleCount: 60,
      spread: 55,
      startVelocity: 25,
      ticks: 300,
      decay: 0.92,
      gravity: 0.6,
      scalar: 1.1,
      origin: { x: Math.min(x, 0.95), y: Math.max(y, 0.05) },
      colors: ['#5272F7', '#EBF25C', '#34d399', '#f472b6', '#facc15'],
    });
  }, []);

  const haptic = useCallback((ms = 12) => {
    if ('vibrate' in navigator) navigator.vibrate(ms);
  }, []);

  const handleComplete = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    haptic(20);
    if (!completedLabel) fireConfetti();
    await onSwipeComplete();
  }, [onSwipeComplete, fireConfetti, haptic]);

  const updateOffset = useCallback((value: number) => {
    offsetXRef.current = value;
    setOffsetX(value);
  }, []);

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || completedRef.current) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startOffsetRef.current = offsetXRef.current;
    trackWidthRef.current = trackRef.current?.offsetWidth ?? 0;
    hapticFiredRef.current = false;
    setDragging(true);
  }, [disabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const touch = e.touches[0];
    const delta = (touch.clientX - startXRef.current) * DAMPING;
    const clamped = Math.max(0, Math.min(startOffsetRef.current + delta, maxOffset()));
    updateOffset(clamped);
    // Haptic tick when crossing threshold
    const ratio = clamped / maxOffset();
    if (ratio >= COMPLETE_THRESHOLD && !hapticFiredRef.current) {
      hapticFiredRef.current = true;
      haptic(8);
    } else if (ratio < COMPLETE_THRESHOLD) {
      hapticFiredRef.current = false;
    }
  }, [dragging, maxOffset, updateOffset, haptic]);

  const onTouchEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const ratio = offsetXRef.current / maxOffset();
    if (ratio >= COMPLETE_THRESHOLD) {
      updateOffset(maxOffset());
      handleComplete();
    } else {
      updateOffset(0);
    }
  }, [dragging, maxOffset, updateOffset, handleComplete]);

  // Mouse events (for desktop)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || completedRef.current) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startOffsetRef.current = offsetXRef.current;
    trackWidthRef.current = trackRef.current?.offsetWidth ?? 0;
    hapticFiredRef.current = false;
    setDragging(true);
  }, [disabled]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const delta = (e.clientX - startXRef.current) * DAMPING;
      const clamped = Math.max(0, Math.min(startOffsetRef.current + delta, maxOffset()));
      offsetXRef.current = clamped;
      setOffsetX(clamped);
    };

    const onUp = () => {
      setDragging(false);
      const ratio = offsetXRef.current / maxOffset();
      if (ratio >= COMPLETE_THRESHOLD) {
        offsetXRef.current = maxOffset();
        setOffsetX(maxOffset());
        handleComplete();
      } else {
        offsetXRef.current = 0;
        setOffsetX(0);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, maxOffset, handleComplete]);

  const progress = trackWidthRef.current > 0 ? offsetX / maxOffset() : 0;

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-button rounded-xl overflow-hidden select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${completed ? (completedLabel ? 'bg-primary/20' : 'bg-green-500') : 'bg-primary/15'}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Filled track */}
      {!completed && (
        <div
          className="absolute inset-y-0 left-0 rounded-xl bg-primary/25 transition-none"
          style={{ width: offsetX + THUMB_SIZE }}
        />
      )}

      {/* Label */}
      <div
        className={`absolute inset-0 flex items-center justify-center text-sm font-medium transition-opacity ${
          completed ? 'text-white' : 'text-primary'
        }`}
        style={{
          opacity: completed ? 1 : Math.max(0, 1 - progress * 1.5),
          paddingLeft: completed ? 0 : THUMB_SIZE,
        }}
      >
        {completed ? (completedLabel || '🎉') : label}
      </div>

      {/* Draggable thumb */}
      {!completed && (
        <div
          className={`absolute top-0 bottom-0 left-0 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md ${
            dragging ? 'scale-105' : 'transition-transform'
          } ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
          style={{
            width: THUMB_SIZE,
            transform: `translateX(${offsetX}px)${dragging ? ' scale(1.05)' : ''}`,
            transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
