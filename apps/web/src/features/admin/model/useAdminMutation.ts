import { useRef, useState } from 'react';

import { AdminApiError } from '@/entities/admin';

export const useAdminMutation = (onConflict?: () => void) => {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err);
      if (err instanceof AdminApiError && err.status === 409) onConflict?.();
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { run, busy, error };
};
