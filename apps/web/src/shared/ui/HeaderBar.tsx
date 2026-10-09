import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

/** Пункт навигации шапки: активный — подчёркивание 2px цветом бренда. */
export const headerNavItemClassName = cn(
  'inline-flex min-h-11 items-center border-y-2 border-transparent px-3 text-[0.9375rem] font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none',
  'hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  'aria-[current=page]:border-b-primary aria-[current=page]:font-semibold aria-[current=page]:text-foreground',
);

interface HeaderBarProps {
  brand: ReactNode;
  context?: ReactNode;
  nav?: ReactNode;
  navLabel?: string;
  search?: ReactNode;
  actions?: ReactNode;
  /** Показать разделы второй строкой на телефоне (у работодателя своя нижняя навигация). */
  mobileNav?: boolean;
  className?: string;
}

/**
 * Единая шапка для всех ролей. Порядок всегда один:
 * логотип → контекст (компания) → разделы → поиск → действия (тема, профиль / «Войти»).
 */
export const HeaderBar = ({
  brand,
  context,
  nav,
  navLabel = 'Основная навигация',
  search,
  actions,
  mobileNav,
  className,
}: HeaderBarProps) => (
  <header
    className={cn(
      'sticky top-0 z-40 border-b border-border bg-card',
      className,
    )}
  >
    <div className="container-page flex h-16 items-center gap-3 md:gap-5">
      <div className="flex shrink-0 items-center">{brand}</div>
      {context}
      {nav && (
        <nav
          aria-label={navLabel}
          className="hidden items-stretch self-stretch md:flex"
        >
          {nav}
        </nav>
      )}
      <div className="flex-1" />
      {search && <div className="hidden w-64 md:block lg:w-72">{search}</div>}
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
    {search && <div className="container-page pb-3 md:hidden">{search}</div>}
    {nav && mobileNav && (
      <nav
        aria-label={`${navLabel} (мобильная)`}
        className="container-page -mt-1 flex overflow-x-auto md:hidden"
      >
        {nav}
      </nav>
    )}
  </header>
);
