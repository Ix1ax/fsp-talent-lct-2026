'use client';

import type { ComponentProps } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = ComponentProps<typeof SonnerToaster>;

export const Toaster = (props: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="top-right"
      richColors
      expand
      visibleToasts={3}
      gap={12}
      closeButton
      duration={4000}
      containerAriaLabel="Уведомления"
      toastOptions={{
        closeButtonAriaLabel: 'Закрыть уведомление',
        style: {
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
        },
      }}
      {...props}
    />
  );
};

export { toast } from 'sonner';
