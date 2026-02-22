'use client';

import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

const chipClass = (selected: boolean, editable: boolean) =>
  cn(
    'px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors',
    selected
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-muted/50 text-muted-foreground border-transparent',
    editable && 'cursor-pointer hover:bg-primary/5',
    !editable && 'cursor-default'
  );

interface ChipGroupProps {
  options: readonly string[];
  selected: string | string[];
  i18nPrefix: string;
  onChange: (value: string | string[]) => void;
  editing: boolean;
  multi?: boolean;
}

export default function ChipGroup({
  options,
  selected,
  i18nPrefix,
  onChange,
  editing,
  multi = true,
}: ChipGroupProps) {
  const { t } = useTranslation();

  const isSelected = (opt: string) =>
    multi ? (selected as string[]).includes(opt) : selected === opt;

  const items = editing
    ? options
    : options.filter((opt) => isSelected(opt));

  if (items.length === 0) return null;

  const handleClick = (opt: string) => {
    if (!editing) return;
    if (multi) {
      const arr = selected as string[];
      onChange(arr.includes(opt) ? arr.filter((i) => i !== opt) : [...arr, opt]);
    } else {
      onChange(selected === opt ? '' : opt);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={!editing}
          onClick={() => handleClick(opt)}
          className={chipClass(isSelected(opt), editing)}
        >
          {t(`preferenceOptions.${i18nPrefix}.${opt}`)}
        </button>
      ))}
    </div>
  );
}
