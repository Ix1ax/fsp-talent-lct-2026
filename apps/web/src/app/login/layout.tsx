import type { ReactNode } from 'react';

// Вход — отдельный экран без шапки и подвала сайта.
export default function LoginLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
