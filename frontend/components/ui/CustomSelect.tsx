'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = '请选择',
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-button h-button rounded-button border border-border bg-background text-foreground hover:bg-muted transition-colors"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform ml-2 flex-shrink-0',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full h-12 px-4 flex items-center justify-between text-left transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-5 h-5 flex-shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
