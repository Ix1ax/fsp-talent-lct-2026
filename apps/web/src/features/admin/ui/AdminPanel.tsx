import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';
import { Card } from '@/shared/ui';

interface AdminPanelProps extends ComponentProps<typeof Card> {
  children: ReactNode;
}

export const AdminPanel = ({ className, ...props }: AdminPanelProps) => {
  return (
    <Card
      className={cn(
        'min-w-0 gap-5 p-4 wrap-anywhere sm:p-6 lg:p-8 [&_button:not([role=checkbox]):not([role=switch])]:min-h-11 [&_a[data-slot=button]]:min-h-11 [&_input]:min-h-11 [&_input]:text-base [&_textarea]:text-base sm:[&_input]:text-sm sm:[&_textarea]:text-sm',
        className,
      )}
      {...props}
    />
  );
};
