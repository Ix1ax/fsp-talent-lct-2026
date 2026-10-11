'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

interface AppHeaderPositionProps {
  children: ReactNode;
}

// Доля высоты экрана, после которой шапка лендинга уходит с тёмного первого экрана.
const HERO_LEAVE_RATIO = 0.6;

/**
 * На лендинге шапка закреплена поверх первого экрана. Пока она над тёмным
 * видео, используется тёмная тема независимо от темы сайта; ниже — обычная.
 */
export const AppHeaderPosition = ({ children }: AppHeaderPositionProps) => {
  const isHome = usePathname() === '/';
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    if (!isHome) return;
    const update = () =>
      setOverHero(window.scrollY < window.innerHeight * HERO_LEAVE_RATIO);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [isHome]);

  if (!isHome) return <div className="contents">{children}</div>;

  return (
    <div
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors',
        // text-foreground: наследуемый цвет пересчитывается по токенам темы обёртки,
        // иначе кнопки берут уже вычисленный цвет body из светлой темы.
        overHero && 'dark text-foreground',
      )}
    >
      {children}
    </div>
  );
};
