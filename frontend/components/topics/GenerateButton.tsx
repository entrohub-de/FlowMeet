'use client';

import { Sparkles, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface GenerateButtonProps {
  onGenerate: () => void;
  loading: boolean;
  disabled: boolean;
  isRegenerate?: boolean;
  minutesRemaining?: number;
}

export function GenerateButton({
  onGenerate,
  loading,
  disabled,
  isRegenerate = false,
  minutesRemaining,
}: GenerateButtonProps) {
  const { t } = useTranslation();

  const getButtonText = () => {
    if (loading) {
      return t('topic.generating');
    }
    if (disabled && minutesRemaining) {
      return t('topic.rateLimited').replace('{minutes}', String(minutesRemaining));
    }
    return isRegenerate ? t('topic.regenerate') : t('topic.generate');
  };

  const Icon = isRegenerate ? RefreshCw : Sparkles;

  return (
    <button
      onClick={onGenerate}
      disabled={disabled || loading}
      className={`
        w-full px-button h-button rounded-button font-medium
        transition-all duration-200
        flex items-center justify-center gap-2
        ${
          disabled || loading
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
        }
      `}
    >
      <Icon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      <span>{getButtonText()}</span>
    </button>
  );
}
