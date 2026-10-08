import { Children, type ReactNode } from 'react';

import { Stagger } from '@/shared/ui';

interface AdminAnimatedListProps {
  children: ReactNode;
}

export const AdminAnimatedList = ({ children }: AdminAnimatedListProps) => {
  const count = Children.count(children);
  if (!count) return null;
  return (
    <Stagger
      interval={Math.min(0.035, 0.2 / count)}
      className="min-w-0 divide-y divide-border [&_button:not([role=checkbox])]:min-h-11 [&_a[data-slot=button]]:min-h-11"
    >
      {children}
    </Stagger>
  );
};
