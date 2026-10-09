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
      'flex flex-wrap items-end justify-between gap-x-6 gap-y-4',
      className,
    )}
  >
    <div className="flex max-w-3xl min-w-0 flex-col gap-2">
      {eyebrow && (
        <p className="font-mono text-xs tracking-[0.08em] text-brand-text uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-balance md:text-[2.5rem] md:leading-[3rem]">
        {title}
      </h1>
      {description && (
        <div className="text-base leading-relaxed text-muted-foreground">
          {description}
        </div>
      )}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
  </header>
);
