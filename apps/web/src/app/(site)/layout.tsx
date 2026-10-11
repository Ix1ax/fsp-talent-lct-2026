import type { ReactNode } from 'react';

import { AppHeader } from '@/widgets/app-header/server';
import { SiteFooter } from '@/widgets/site-footer';

interface SiteLayoutProps {
  children: ReactNode;
}

const SiteLayout = ({ children }: Readonly<SiteLayoutProps>) => {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
};

export default SiteLayout;
