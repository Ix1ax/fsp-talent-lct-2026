import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/utils';
export const MetaLabel = ({ className, ...props }: ComponentProps<'span'>) => {
  return (
    <span
      className={cn(
        'font-mono text-[10px] uppercase tracking-wider text-caption',
        className,
      )}
      {...props}
    />
  );
};
