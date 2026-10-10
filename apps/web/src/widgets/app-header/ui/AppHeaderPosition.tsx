'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface AppHeaderPositionProps {
  children: ReactNode;
}

export const AppHeaderPosition = ({ children }: AppHeaderPositionProps) => {
  const isHome = usePathname() === '/';

  return (
    <div
      className={
        isHome
          ? 'contents [&>header]:absolute [&>header]:inset-x-0 [&>header]:top-0'
          : 'contents'
      }
    >
      {children}
    </div>
  );
};
