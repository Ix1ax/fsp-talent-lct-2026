import { describe, expect, it } from 'vitest';

import { getPreviewRecovery } from '../previewRecovery';

const id = '11111111-1111-4111-8111-111111111111';
const key = '22222222-2222-4222-8222-222222222222';
describe('preview recovery', () => {
  it('restores the pending key after transport failure or reload', () => {
    expect(getPreviewRecovery(JSON.stringify({ key }), null)).toEqual({
      key,
      id: undefined,
    });
  });
  it('uses the URL attempt instead of starting a new attempt', () => {
    expect(getPreviewRecovery(JSON.stringify({ key }), id)).toEqual({
      key,
      id,
    });
    expect(getPreviewRecovery(JSON.stringify({ id }), null).id).toBe(id);
  });
  it('recovers from malformed or null storage and preserves explicit invalid URLs for API validation', () => {
    for (const saved of ['null', '{', '[]', '{"key":123}'])
      expect(getPreviewRecovery(saved, null)).toEqual({ id: undefined });
    expect(getPreviewRecovery(null, 'invalid').id).toBe('invalid');
  });
});
