'use client';
import type { ReactNode } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui';
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
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <button
        type="button"
        disabled={disabled}
        className={
          empty
            ? 'mx-1 inline border-b border-dashed border-input px-1.5 font-mono text-[.84em] text-caption disabled:cursor-default'
            : 'mx-1 inline border-b border-primary bg-token px-1.5 font-mono text-[.84em] text-brand-text disabled:cursor-default'
        }
        aria-label={`${title}: ${label}`}
      >
        {label}
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="w-72 max-w-[calc(100vw-2rem)] rounded-none border-input p-4 shadow-popover"
    >
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-caption">
        {title}
      </p>
      {children}
    </PopoverContent>
  </Popover>
);
