import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}
export const AdminPageHeader = ({
  title,
  description,
  action,
}: AdminPageHeaderProps) => (
  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
    {action && (
      <div className="flex items-center gap-2 sm:justify-end">{action}</div>
    )}
  </div>
);
