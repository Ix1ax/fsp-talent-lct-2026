'use client';

import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

type SectionTab<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  disabled?: boolean;
};

interface SectionTabsProps<T extends string> {
  label: string;
  items: SectionTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

/** Вкладки внутри страницы — тот же вид, что у плашки разделов компании. */
export const SectionTabs = <T extends string>({
  label,
  items,
  value,
  onValueChange,
  className,
}: SectionTabsProps<T>) => (
  <div
    role="tablist"
    aria-label={label}
    className={cn(
      'flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card p-1.5',
      className,
    )}
  >
    {items.map((item) => {
      const selected = item.value === value;
      return (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={selected}
          disabled={item.disabled}
          onClick={() => onValueChange(item.value)}
          className={cn(
            'flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 max-sm:flex-1 max-sm:justify-center',
            selected ? 'bg-accent text-brand-text' : 'text-muted-foreground',
          )}
        >
          {item.icon && <item.icon className="size-4" aria-hidden />}
          {item.label}
        </button>
      );
    })}
  </div>
);
