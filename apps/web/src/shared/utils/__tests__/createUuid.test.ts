import { afterEach, describe, expect, it, vi } from 'vitest';

import { createUuid } from '../createUuid';

afterEach(() => vi.unstubAllGlobals());

describe('UUIDs for HTTP deployments', () => {
  it('uses native UUIDs when available', () => {
    const randomUUID = vi.fn(() => 'native-id');
    vi.stubGlobal('crypto', { randomUUID });
    expect(createUuid()).toBe('native-id');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('generates unique RFC 4122 v4 UUIDs without randomUUID', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    const ids = Array.from({ length: 100 }, createUuid);
    expect(new Set(ids).size).toBe(100);
    for (const id of ids)
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
  });
});
