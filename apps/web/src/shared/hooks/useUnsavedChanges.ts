import { useEffect } from 'react';

import { createUnsavedChangesGuard } from './unsavedChangesGuard';

let guard: ReturnType<typeof createUnsavedChangesGuard> | undefined;

export const useUnsavedChanges = (dirty: boolean) => {
  useEffect(() => {
    if (!dirty) return;
    guard ??= createUnsavedChangesGuard(window);
    return guard.register();
  }, [dirty]);
};
