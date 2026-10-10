import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface AdminFieldGridProps extends ComponentProps<'div'> {
  children: ReactNode;
}

// Shared rows keep labels, controls and feedback aligned even when text wraps.
export const AdminFieldGrid = ({
  className,
  ...props
}: AdminFieldGridProps) => (
  <div
    className={cn(
      'grid min-w-0 items-start gap-x-4 gap-y-4 sm:grid-cols-2 [&>[data-admin-field]]:row-span-3 [&>[data-admin-field]]:grid-rows-subgrid',
      className,
    )}
    {...props}
  />
);
