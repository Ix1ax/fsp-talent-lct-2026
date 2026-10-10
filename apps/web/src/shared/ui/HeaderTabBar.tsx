'use client';

import type { ReactNode } from 'react';

import { useScrollDirection } from '@/shared/hooks/useScrollDirection';
import { cn } from '@/shared/lib/utils';

/** Видимость панели по ширине. Классы целиком, чтобы Tailwind их увидел. */
const HIDDEN_FROM = {
  md: 'md:hidden',
  lg: 'lg:hidden',
  xl: 'xl:hidden',
} as const;

interface HeaderTabBarProps {
  /** С этой ширины разделы помещаются в шапку, и панель не нужна. */
  hiddenFrom: keyof typeof HIDDEN_FROM;
  label: string;
  children: ReactNode;
}

/**
 * Нижняя панель основных разделов на телефоне и планшете: иконка над
 * короткой подписью, активный пункт — в фирменной «таблетке».
 * Прячется при прокрутке вниз и возвращается при прокрутке вверх.
 * Отступ под панель у страницы задаёт globals.css по data-bottom-tabs.
 */
export const HeaderTabBar = ({
  hiddenFrom,
  label,
  children,
}: HeaderTabBarProps) => {
  const direction = useScrollDirection(12);

  return (
    <nav
      aria-label={label}
      data-bottom-tabs={hiddenFrom}
      className={cn(
        'pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.04)] backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none',
        direction === 'down' && 'translate-y-full',
        HIDDEN_FROM[hiddenFrom],
      )}
    >
      <div
        className={cn(
          'mx-auto grid max-w-2xl auto-cols-fr grid-flow-col gap-1 px-2 py-1.5',
          // Пункт — колонка: иконка в «таблетке» над подписью.
          '[&>*]:min-h-14 [&>*]:min-w-0 [&>*]:flex-col [&>*]:justify-center [&>*]:gap-1 [&>*]:rounded-xl [&>*]:px-1 [&>*]:text-center [&>*]:text-[0.6875rem] [&>*]:leading-tight [&>*]:font-medium',
          '[&>*]:hover:bg-transparent [&>[aria-current=page]]:bg-transparent [&>[aria-current=page]]:shadow-none',
          "[&_svg]:box-content [&_svg]:rounded-full [&_svg]:px-4 [&_svg]:py-1 [&_svg]:transition-colors [&_svg:not([class*='size-'])]:size-5",
          '[&>[aria-current=page]_svg]:bg-accent [&>[aria-current=page]_svg]:text-brand-text',
          '[&_[data-label-full]]:hidden [&_span]:max-w-full [&_span]:truncate',
        )}
      >
        {children}
      </div>
    </nav>
  );
};
