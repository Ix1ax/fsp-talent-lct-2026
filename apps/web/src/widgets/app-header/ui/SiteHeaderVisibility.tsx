'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
export const SiteHeaderVisibility = ({ children }: { children: ReactNode }) =>
  usePathname().startsWith('/employer') ? null : children;
