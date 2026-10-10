import { useEffect, useRef } from 'react';

import { getUnsavedChangesGuard } from './unsavedChangesGuard';

type UnsavedChangesOptions = {
  preserveWithin?: readonly string[];
  scopeSearchParams?: readonly string[];
};

export const useUnsavedChanges = (
  dirty: boolean,
  options: UnsavedChangesOptions = {},
) => {
  const release = useRef<(() => void) | undefined>(undefined);
  const { preserveWithin, scopeSearchParams } = options;
  useEffect(() => {
    const guard = getUnsavedChangesGuard();
    if (!dirty) return;
    release.current = guard.register({ preserveWithin, scopeSearchParams });
    return () => {
      release.current?.();
      release.current = undefined;
    };
  }, [dirty, preserveWithin, scopeSearchParams]);
  const markSaved = () => {
    release.current?.();
    release.current = undefined;
  };
  const discard = (action: () => void) =>
    getUnsavedChangesGuard().discard(dirty, () => {
      markSaved();
      action();
    });
  return { discard, markSaved };
};
