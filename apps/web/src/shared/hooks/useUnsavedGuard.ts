'use client';

import { getUnsavedChangesGuard } from './unsavedChangesGuard';
import { useUnsavedChanges } from './useUnsavedChanges';

export const useUnsavedGuard = (
  dirty: boolean,
  pending = false,
  protectPage = true,
) => {
  const { markSaved } = useUnsavedChanges(dirty && protectPage);

  const guard = (action: () => void) => {
    if (!pending)
      getUnsavedChangesGuard().discard(dirty, () => {
        markSaved();
        action();
      });
  };

  return { guard };
};
