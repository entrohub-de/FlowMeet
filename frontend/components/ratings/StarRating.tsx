'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showLabel = false,
}: StarRatingProps) {
  const { t } = useTranslation();
  const [hoverValue, setHoverValue] = useState<number>(0);

  const displayValue = hoverValue || value;

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`
              transition-all
              ${!readonly && 'hover:scale-110 cursor-pointer'}
              ${readonly && 'cursor-default'}
            `}
            aria-label={`Rate ${rating} stars`}
          >
            <Star
              className={`
                ${sizeClasses[size]}
                transition-colors
                ${
                  rating <= displayValue
                    ? 'fill-accent text-accent'
                    : 'text-muted'
                }
                ${!readonly && rating <= hoverValue && 'fill-accent/80 text-accent/80'}
              `}
            />
          </button>
        ))}
      </div>

      {showLabel && displayValue > 0 && (
        <span className="text-sm text-muted-foreground ml-2">
          {t(`rating.stars.${displayValue}`)}
        </span>
      )}
    </div>
  );
}
