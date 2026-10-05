import './globals.css';

import type { Metadata } from 'next';

import { AuthBootstrap } from './AuthBootstrap';

export const metadata: Metadata = {
  title: 'ФСП · Основа платформы',
  other: {
    'color-scheme': 'dark',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <AuthBootstrap>{children}</AuthBootstrap>
      </body>
    </html>
  );
}
