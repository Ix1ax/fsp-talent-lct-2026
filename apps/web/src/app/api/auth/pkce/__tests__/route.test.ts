import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { GET } from '../route';

describe('server PKCE generation', () => {
  it('returns fresh S256 pairs and prevents caching', async () => {
    const first = GET();
    const { verifier, challenge } = await first.json();
    const second = await GET().json();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{86}$/);
    expect(challenge).toBe(
      createHash('sha256').update(verifier).digest('base64url'),
    );
    expect(second.verifier).not.toBe(verifier);
    expect(first.headers.get('cache-control')).toBe('no-store');
  });
});
