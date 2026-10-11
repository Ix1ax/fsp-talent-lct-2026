'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

interface AppHeaderPositionProps {
  children: ReactNode;
}

const HERO_LEAVE_RATIO = 0.6;

/** Над интро шапка всегда тёмная; ниже наследует выбранную тему сайта. */
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
        overHero && 'dark text-foreground',
      )}
    >
      {children}
    </div>
  );
};
