import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { createFocusGuard } from './createFocusGuard';

type UseFocusGuardOptions = {
  enabled: boolean;
  onLimitReached: () => Promise<unknown>;
  storageKey?: string;
  limit?: number;
};

export const useFocusGuard = ({
  enabled,
  onLimitReached,
  storageKey,
  limit = 2,
}: UseFocusGuardOptions) => {
  const guard = useMemo(
    () => createFocusGuard({ limit, storageKey }),
    [limit, storageKey],
  );

  const violations = useSyncExternalStore(
    guard.subscribe,
    guard.getSnapshot,
    guard.getServerSnapshot,
  );

  const storageError = useSyncExternalStore(
    guard.subscribe,
    guard.getStorageError,
    guard.getServerStorageError,
  );

  useEffect(() => {
    if (enabled) return guard.start(window);
  }, [enabled, guard]);

  useEffect(() => {
    if (enabled && violations >= limit) void onLimitReached();
  }, [enabled, violations, limit, onLimitReached]);

  return { storageError, violations, limitReached: violations >= limit };
};
