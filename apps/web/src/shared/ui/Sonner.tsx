'use client';

import type { ComponentProps } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export const Toaster = (props: ComponentProps<typeof SonnerToaster>) => (
  <SonnerToaster
    theme="dark"
    position="top-right"
    richColors
    containerAriaLabel="Уведомления"
    {...props}
  />
);

export { toast } from 'sonner';
