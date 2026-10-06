import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';

import { cn } from '@/shared/lib/utils';
import { Toaster } from '@/shared/ui/Sonner';
import { TooltipProvider } from '@/shared/ui/Tooltip';

import { AuthBootstrap } from './AuthBootstrap';

import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'ФСП · Основа платформы',
  other: {
    'color-scheme': 'dark',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru" className={cn('dark font-sans', geist.variable)}>
      <body>
        <TooltipProvider>
          <AuthBootstrap>{children}</AuthBootstrap>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
