'use client';

import type { ReactNode } from 'react';
import { ThemeProvider as Provider } from 'next-themes';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => (
  <Provider
    attribute="class"
    defaultTheme="dark"
    enableSystem
    disableTransitionOnChange
  >
    {children}
  </Provider>
);
