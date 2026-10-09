'use client';

import { type ReactNode, useEffect } from 'react';

import { initializeUnsavedChangesGuard } from '@/shared/hooks/navigation';

interface UnsavedChangesProviderProps {
  children: ReactNode;
}

export const UnsavedChangesProvider = ({
  children,
}: UnsavedChangesProviderProps) => {
  useEffect(() => initializeUnsavedChangesGuard(), []);
  return children;
};
