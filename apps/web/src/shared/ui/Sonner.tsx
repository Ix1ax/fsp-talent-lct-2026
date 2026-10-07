'use client';

import type { ComponentProps } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = (props: ComponentProps<typeof SonnerToaster>) => {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="top-right"
      richColors
      containerAriaLabel="Уведомления"
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--input)',
          borderRadius: 0,
          boxShadow: 'inset 3px 0 0 var(--primary)',
        },
      }}
      {...props}
    />
  );
};

export { toast } from 'sonner';
