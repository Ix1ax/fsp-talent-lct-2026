'use client';

import type { ComponentProps } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = ComponentProps<typeof SonnerToaster>;

// Как у плашки cookie: над нижней навигацией, которая видна до xl.
const TOASTER_BOTTOM = 'calc(5.5rem + env(safe-area-inset-bottom))';

export const Toaster = (props: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="bottom-right"
      offset={{ bottom: TOASTER_BOTTOM, right: '1.5rem' }}
      mobileOffset={{ bottom: TOASTER_BOTTOM, left: '1rem', right: '1rem' }}
      expand
      visibleToasts={3}
      gap={12}
      closeButton
      duration={4000}
      containerAriaLabel="Уведомления"
      toastOptions={{
        closeButtonAriaLabel: 'Закрыть уведомление',
        // Оформление поповера дизайн-системы; цвет статуса несёт только иконка.
        style: {
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          boxShadow: 'var(--shadow-popover)',
        },
        classNames: {
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-destructive',
          warning: '[&_[data-icon]]:text-warning',
          description: 'text-muted-foreground!',
          // Крестик справа, как в диалогах.
          closeButton: 'right-0! left-auto! translate-x-[35%]!',
        },
      }}
      {...props}
    />
  );
};

export { toast } from 'sonner';
