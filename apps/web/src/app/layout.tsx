import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Onest } from 'next/font/google';
import localFont from 'next/font/local';

import { cn } from '@/shared/lib/utils';
import { Toaster, TooltipProvider } from '@/shared/ui';
import { CookieNotice } from '@/widgets/cookie-notice';

import { AuthBootstrap } from './AuthBootstrap';
import { ThemeProvider } from './ThemeProvider';
import { UnsavedChangesProvider } from './UnsavedChangesProvider';

import './globals.css';

interface RootLayoutProps {
  children: ReactNode;
}

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
});

const jetbrains = localFont({
  src: [
    { path: './fonts/JetBrainsMono-Regular.ttf', weight: '400' },
    { path: './fonts/JetBrainsMono-Medium.ttf', weight: '500' },
  ],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ФСП Скаут',
  other: {
    'color-scheme': 'dark light',
  },
};

const RootLayout = ({ children }: Readonly<RootLayoutProps>) => {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={cn('font-sans', onest.variable, jetbrains.variable)}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <UnsavedChangesProvider>
              <AuthBootstrap>{children}</AuthBootstrap>
            </UnsavedChangesProvider>
            <Toaster />
            <CookieNotice />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
