import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface PageHeaderProps {
  /** Моно-метка роли и контекста: «Работодатель · Технологии Севера». */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Одно главное действие страницы. */
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      'flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:gap-y-4',
      className,
    )}
  >
    <div className="flex max-w-3xl min-w-0 flex-col gap-2">
      {eyebrow && (
        <p className="truncate font-mono text-[0.6875rem] tracking-[0.08em] text-brand-text uppercase md:text-xs">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[1.75rem] leading-9 font-bold tracking-tight text-balance md:text-[2.5rem] md:leading-[3rem]">
        {title}
      </h1>
      {description && (
        <div className="text-[0.9375rem] leading-relaxed text-muted-foreground md:text-base">
          {description}
        </div>
      )}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
  </header>
);
