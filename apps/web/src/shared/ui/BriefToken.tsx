import type { ReactNode } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { Button } from './Button';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

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
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="h-auto min-h-20 w-full items-start justify-between gap-3 whitespace-normal rounded-md bg-transparent px-4 py-3 text-left disabled:bg-transparent disabled:text-foreground"
        aria-label={`${title}: ${label}`}
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-normal text-muted-foreground">
            {title}
          </span>
          <span
            className={cn(
              'text-base font-medium wrap-anywhere',
              empty && 'text-muted-foreground',
            )}
          >
            {label}
          </span>
        </span>
        {!disabled && (
          <ChevronDownIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-4">
      <p className="mb-3 text-base font-semibold">{title}</p>
      {children}
    </PopoverContent>
  </Popover>
);
