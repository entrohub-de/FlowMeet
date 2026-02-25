'use client';

import { CheckCircle2, X } from 'lucide-react';
import SwipeToSignup from './SwipeToSignup';
import { formatPrice, isEventFree } from '@/lib/utils';

interface EventCardActionsProps {
  loading: boolean;
  signedUp: boolean;
  signingUp: boolean;
  userId: string | null;
  onSignup: () => void;
  priceCents?: number | null;
  currency?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function EventCardActions({ loading, signedUp, signingUp, userId, onSignup, priceCents, currency, t }: EventCardActionsProps) {
  if (loading) {
    return (
      <div className="pt-2 border-t border-border">
        <div className="w-full h-12 flex items-center justify-center text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (signedUp) {
    return (
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium text-sm inline-flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {t('user.signedUp')}
          </span>
          <button
            onClick={onSignup}
            disabled={signingUp}
            className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border hover:border-destructive/30 font-medium text-sm transition-colors inline-flex items-center gap-1"
          >
            {signingUp ? '...' : <><X className="w-3.5 h-3.5" />{t('user.cancelSignup')}</>}
          </button>
        </div>
      </div>
    );
  }

  const isFree = isEventFree({ price_cents: priceCents });
  const priceLabel = !isFree && priceCents && currency
    ? formatPrice(priceCents, currency)
    : null;

  const label = priceLabel
    ? `${t('user.swipeToSignup')} · ${priceLabel}`
    : t('user.swipeToSignup');

  return (
    <div className="pt-2 border-t border-border">
      <SwipeToSignup
        label={label}
        disabled={signingUp || !userId}
        onSwipeComplete={onSignup}
        completedLabel={!isFree ? t('user.redirectingToPayment') : undefined}
      />
    </div>
  );
}
