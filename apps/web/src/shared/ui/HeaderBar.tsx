import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

import { HeaderMenu } from './HeaderMenu';
import { HeaderMobileSearch } from './HeaderMobileSearch';
import { HeaderTabBar } from './HeaderTabBar';

/** Пункт навигации шапки: активный — белая подложка и цвет бренда. */
export const headerNavItemClassName = cn(
  'flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none',
  'hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  'aria-[current=page]:bg-card aria-[current=page]:text-brand-text aria-[current=page]:shadow-xs',
  "[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
);

/**
 * С какой ширины разделы видны в самой шапке. Ниже — кнопка меню.
 * Классы перечислены целиком, чтобы Tailwind их увидел.
 */
const NAV_FROM = {
  md: { nav: 'md:flex', menu: 'md:hidden' },
  lg: { nav: 'lg:flex', menu: 'lg:hidden' },
  xl: { nav: 'xl:flex', menu: 'xl:hidden' },
} as const;

export type HeaderNavBreakpoint = keyof typeof NAV_FROM;

interface HeaderBarProps {
  brand: ReactNode;
  context?: ReactNode;
  nav?: ReactNode;
  navLabel?: string;
  /** Ширина, с которой разделы помещаются в шапку. Чем больше пунктов — тем позже. */
  navFrom?: HeaderNavBreakpoint;
  search?: ReactNode;
  actions?: ReactNode;
  /** Пункты для меню на узких экранах. По умолчанию — те же, что в nav; null — без меню. */
  menuNav?: ReactNode;
  /** Нижний блок меню: справочник, тема и другие второстепенные действия. */
  menuExtra?: ReactNode;
  /** Основные разделы для нижней панели на узких экранах; остальное — в меню. */
  tabs?: ReactNode;
  className?: string;
}

/**
 * Единая шапка для всех ролей: плавающая полупрозрачная плашка.
 * Порядок всегда один: логотип → контекст → разделы → поиск → действия.
 * На широком экране разделы — иконка с подписью (до 2xl — короткой).
 * Когда разделы не помещаются, основные переезжают в нижнюю панель табов,
 * а полный список с второстепенными пунктами — в меню-бургер справа.
 * Шапка остаётся одной строкой на любой ширине.
 */
export const HeaderBar = ({
  brand,
  context,
  nav,
  navLabel = 'Основная навигация',
  navFrom = 'lg',
  search,
  actions,
  menuNav = nav,
  menuExtra,
  tabs,
  className,
}: HeaderBarProps) => {
  return (
    <header
      className={cn(
        // Полоса вокруг плашки прозрачна и пропускает клики; размыта только сама плашка.
        'pointer-events-none sticky top-0 z-40 pt-3 pb-2',
        className,
      )}
    >
      <div className="container-page">
        <div className="pointer-events-auto flex items-center gap-x-3 rounded-2xl border border-border/60 bg-muted/80 px-3 py-2 shadow-xs backdrop-blur-xl supports-backdrop-filter:bg-muted/70 sm:gap-x-4 sm:px-4">
          <div className="flex shrink-0 items-center">{brand}</div>
          {context}
          {nav && (
            <nav
              aria-label={navLabel}
              className={cn(
                'hidden min-w-0 shrink-0 items-center gap-1',
                NAV_FROM[navFrom].nav,
                '[&_[data-label-full]]:hidden 2xl:[&_[data-label-full]]:inline 2xl:[&_[data-label-short]]:hidden',
              )}
            >
              {nav}
            </nav>
          )}
          <div className="flex-1" />
          {search && (
            <div className="hidden w-64 md:block lg:w-72">{search}</div>
          )}
          {(actions || search || menuNav) && (
            <div className="flex shrink-0 items-center gap-2">
              {search && <HeaderMobileSearch>{search}</HeaderMobileSearch>}
              {actions}
              {menuNav && (
                <HeaderMenu
                  className={NAV_FROM[navFrom].menu}
                  nav={menuNav}
                  extra={menuExtra}
                />
              )}
            </div>
          )}
        </div>
      </div>
      {/* Вне размытой плашки: backdrop-filter сломал бы fixed-позиционирование. */}
      {tabs && (
        <HeaderTabBar hiddenFrom={navFrom} label={`${navLabel} (панель)`}>
          {tabs}
        </HeaderTabBar>
      )}
    </header>
  );
};
