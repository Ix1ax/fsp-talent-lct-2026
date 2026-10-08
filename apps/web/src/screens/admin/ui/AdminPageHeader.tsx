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
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold wrap-anywhere sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
    {action && (
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-start lg:justify-end [&>button]:h-auto [&>button]:min-h-11 [&>button]:w-full [&>button]:whitespace-normal [&>a]:h-auto [&>a]:min-h-11 [&>a]:w-full [&>a]:whitespace-normal sm:[&>button]:w-auto sm:[&>a]:w-auto">
        {action}
      </div>
    )}
  </div>
);
