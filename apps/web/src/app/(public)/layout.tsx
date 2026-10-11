import type { ReactNode } from 'react';

import { PublicAppHeader } from '@/widgets/app-header';
import { SiteFooter } from '@/widgets/site-footer';

interface PublicLayoutProps {
  children: ReactNode;
}

// Публичные страницы без серверной сессии: лендинг и документы — статика,
// справочник — ISR. Вход в шапке проверяется в браузере.
const PublicLayout = ({ children }: Readonly<PublicLayoutProps>) => {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicAppHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
};

export default PublicLayout;
