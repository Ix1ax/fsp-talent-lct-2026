import type { ReactNode } from 'react';

import { AppHeader } from '@/widgets/app-header';

export default function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      {children}
    </div>
  );
}
