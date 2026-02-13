'use client';

import { EXPECTATION_TAGS, getTagI18nKey } from '@/lib/expectation-templates';

interface ExpectationTagSelectorProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  t: (key: string) => string;
}

export function ExpectationTagSelector({
  selectedTags,
  onToggleTag,
  t,
}: ExpectationTagSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXPECTATION_TAGS.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggleTag(tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors touch-feedback ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t(getTagI18nKey(tag))}
          </button>
        );
      })}
    </div>
  );
}
