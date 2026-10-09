import type { ReactNode } from 'react';

import { AppHeader } from '@/widgets/app-header';
import { SiteFooter } from '@/widgets/site-footer';

export default function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
