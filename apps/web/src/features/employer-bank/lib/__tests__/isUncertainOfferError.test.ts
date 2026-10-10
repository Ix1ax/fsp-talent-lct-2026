import { expect, it } from 'vitest';

import { ApiError } from '@/shared/api/errors';

import { isUncertainOfferError } from '../isUncertainOfferError';
it.each([0, 500, 502, 503, 504])(
  'requires checking offer history after status %i',
  (status) => {
    expect(isUncertainOfferError(new ApiError(status, 'Failed'))).toBe(true);
  },
);
it.each([400, 401, 403, 409, 422, 429])(
  'allows correcting a rejected offer after status %i',
  (status) => {
    expect(isUncertainOfferError(new ApiError(status, 'Rejected'))).toBe(false);
  },
);
it('does not treat navigation cancellation as an uncertain submission', () => {
  expect(
    isUncertainOfferError(new DOMException('Cancelled', 'AbortError')),
  ).toBe(false);
});
