import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Главное действие или контекст страницы (например, выбор компании). */
  actions?: ReactNode;
  /** Под заголовком внутри той же карточки: вкладки разделов. */
  children?: ReactNode;
  className?: string;
}

/** Заголовок страницы в карточке; надписей над заголовком не используем. */
export const PageHeader = ({
  title,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      'flex min-w-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6',
      className,
    )}
  >
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="grid min-w-0 flex-1 gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex min-w-0 shrink-0 flex-wrap items-start gap-3 lg:max-w-sm lg:justify-end">
          {actions}
        </div>
      )}
    </div>
    {children}
  </header>
);
