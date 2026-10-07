'use client';

import { useState } from 'react';

export const useUnsavedGuard = (dirty: boolean, pending = false) => {
  const [next, setNext] = useState<(() => void) | null>(null);

  const guard = (action: () => void) => {
    if (pending) return;
    if (dirty) setNext(() => action);
    else action();
  };

  const cancel = () => setNext(null);

  const proceed = () => {
    const action = next;
    setNext(null);
    action?.();
  };

  return { guard, cancel, proceed, open: next !== null };
};
