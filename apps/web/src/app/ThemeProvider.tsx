'use client';
import type { ReactNode } from 'react';
import { ThemeProvider as Provider } from 'next-themes';
export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <Provider
    attribute="class"
    defaultTheme="dark"
    enableSystem
    disableTransitionOnChange
  >
    {children}
  </Provider>
);
