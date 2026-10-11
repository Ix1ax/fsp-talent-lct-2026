import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  emitSessionExpired,
  onSessionExpired,
  setSigningOut,
} from '../session.client';

afterEach(() => setSigningOut(false));

describe('session expired events', () => {
  it('notifies listeners when the session expires', () => {
    const listener = vi.fn();
    const off = onSessionExpired(listener);
    emitSessionExpired();
    expect(listener).toHaveBeenCalledOnce();
    off();
  });

  it('stays silent while signing out, so /login does not flash', () => {
    const listener = vi.fn();
    const off = onSessionExpired(listener);
    setSigningOut(true);
    emitSessionExpired();
    expect(listener).not.toHaveBeenCalled();
    off();
  });
});
