import type { ReactNode } from 'react';

import { PageHeader } from '@/shared/ui';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Заголовок раздела админки — тот же, что в кабинетах сайта. */
export const AdminPageHeader = ({
  title,
  description,
  action,
}: AdminPageHeaderProps) => (
  <PageHeader
    title={title}
    description={description}
    actions={
      action && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end [&>a]:h-auto [&>a]:min-h-11 [&>a]:w-full [&>a]:whitespace-normal sm:[&>a]:w-auto [&>button]:h-auto [&>button]:min-h-11 [&>button]:w-full [&>button]:whitespace-normal sm:[&>button]:w-auto">
          {action}
        </div>
      )
    }
  />
);
