import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

import { Popover, PopoverContent, PopoverTrigger } from './Popover';

/**
 * Значение справочника внутри фразы брифа: «Ищем [Frontend] уровня [Middle]…».
 * Заполненное — моноширинный токен с подчёркиванием бренда, пустое — пунктир.
 */
export const briefTokenClassName = (empty?: boolean) =>
  cn(
    'mx-0.5 inline-flex max-w-full items-baseline px-2 py-0.5 align-baseline font-mono text-[0.9em] font-medium leading-snug wrap-anywhere whitespace-normal transition-colors',
    empty
      ? 'rounded-md border border-dashed border-muted-foreground/60 text-muted-foreground'
      : 'rounded-t-md rounded-b-[2px] border-b-2 border-primary bg-token text-brand-text',
  );

interface BriefTokenProps {
  label: string;
  title: string;
  children: ReactNode;
  empty?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const BriefToken = ({
  label,
  title,
  children,
  empty,
  disabled,
  open,
  onOpenChange,
}: BriefTokenProps) => (
  <Popover open={disabled ? false : open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <button
        type="button"
        disabled={disabled}
        aria-label={`${title}: ${label}`}
        className={cn(
          briefTokenClassName(empty),
          'cursor-pointer outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:hover:bg-token aria-expanded:bg-accent',
          empty && 'disabled:hover:bg-transparent',
        )}
      >
        {label}
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
      <p className="text-base font-semibold">{title}</p>
      {children}
    </PopoverContent>
  </Popover>
);
