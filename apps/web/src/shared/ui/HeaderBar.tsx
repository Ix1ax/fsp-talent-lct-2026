import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

import { HeaderMobileSearch } from './HeaderMobileSearch';

/** Пункт навигации шапки: активный — белая подложка и цвет бренда. */
export const headerNavItemClassName = cn(
  'flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none',
  'hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  'aria-[current=page]:bg-card aria-[current=page]:text-brand-text aria-[current=page]:shadow-xs',
  "[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
);

interface HeaderBarProps {
  brand: ReactNode;
  context?: ReactNode;
  nav?: ReactNode;
  navLabel?: string;
  search?: ReactNode;
  actions?: ReactNode;
  /** Вторая строка ниже lg. По умолчанию — те же пункты, что в nav; null — без строки. */
  mobileNav?: ReactNode;
  className?: string;
}

/**
 * Единая шапка для всех ролей: плавающая полупрозрачная плашка.
 * Порядок всегда один: логотип → контекст → разделы → поиск → действия.
 * До 2xl верхняя навигация показывает иконки с доступными названиями ссылок.
 * Ниже lg разделы переносятся второй строкой внутри плашки равными колонками,
 * без горизонтальной прокрутки.
 */
export const HeaderBar = ({
  brand,
  context,
  nav,
  navLabel = 'Основная навигация',
  search,
  actions,
  mobileNav = nav,
  className,
}: HeaderBarProps) => (
  <header
    className={cn(
      // Полоса вокруг плашки прозрачна и пропускает клики; размыта только сама плашка.
      'pointer-events-none sticky top-0 z-40 pt-3 pb-2',
      className,
    )}
  >
    <div className="container-page">
      <div className="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border/60 bg-muted/80 px-3 py-2 shadow-xs backdrop-blur-xl supports-backdrop-filter:bg-muted/70 sm:px-4 lg:flex-nowrap">
        <div className="flex shrink-0 items-center">{brand}</div>
        {context}
        {nav && (
          <nav
            aria-label={navLabel}
            className="hidden shrink-0 items-center gap-1 lg:flex max-2xl:[&_[data-header-label]]:hidden"
          >
            {nav}
          </nav>
        )}
        <div className="flex-1" />
        {search && <div className="hidden w-64 md:block lg:w-72">{search}</div>}
        {(actions || search) && (
          <div className="flex shrink-0 items-center gap-2">
            {search && <HeaderMobileSearch>{search}</HeaderMobileSearch>}
            {actions}
          </div>
        )}
        {mobileNav && (
          <nav
            aria-label={`${navLabel} (мобильная)`}
            className={cn(
              'order-last grid w-full min-w-0 auto-cols-fr grid-flow-col gap-1 border-t border-border/50 pt-2 lg:hidden',
              // На телефоне пункты — равные колонки: иконка над короткой подписью.
              'max-sm:[&>*]:min-h-12 max-sm:[&>*]:flex-col max-sm:[&>*]:justify-center max-sm:[&>*]:gap-1 max-sm:[&>*]:px-1 max-sm:[&>*]:text-center max-sm:[&>*]:text-[0.6875rem] max-sm:[&>*]:leading-tight',
              'sm:[&>*]:justify-center',
              'max-[480px]:[&_[data-header-label]]:hidden',
            )}
          >
            {mobileNav}
          </nav>
        )}
      </div>
    </div>
  </header>
);
