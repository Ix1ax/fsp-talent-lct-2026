import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clientApi } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';

import {
  getIncomingOffer,
  getIncomingOffers,
  respondToIncomingOffer,
  viewIncomingOffer,
} from '../index';

vi.mock('@/shared/api/client', () => ({
  clientApi: { get: vi.fn(), post: vi.fn() },
}));

beforeEach(() => vi.resetAllMocks());

describe('candidate incoming offers', () => {
  it('loads all statuses by default and supports server filtering and pagination', async () => {
    const page = { items: [], total: 0, limit: 20, offset: 0 };
    const signal = new AbortController().signal;
    vi.mocked(clientApi.get).mockResolvedValue({ data: page });
    await expect(getIncomingOffers(undefined, 0, signal)).resolves.toBe(page);
    expect(clientApi.get).toHaveBeenLastCalledWith('/v1/me/offers', {
      params: { status: undefined, limit: 20, offset: 0 },
      signal,
    });
    await getIncomingOffers('accepted', 40, signal);
    expect(clientApi.get).toHaveBeenLastCalledWith('/v1/me/offers', {
      params: { status: 'accepted', limit: 20, offset: 40 },
      signal,
    });
  });

  it('keeps reading conditions separate from marking a view and sends no view body', async () => {
    const signal = new AbortController().signal;
    const offer = { id: 'offer', status: 'viewed' };
    vi.mocked(clientApi.get).mockResolvedValue({ data: offer });
    vi.mocked(clientApi.post).mockResolvedValue({ data: offer });
    await expect(getIncomingOffer('offer', signal)).resolves.toBe(offer);
    expect(clientApi.post).not.toHaveBeenCalled();
    await expect(viewIncomingOffer('offer', signal)).resolves.toBe(offer);
    expect(clientApi.post).toHaveBeenCalledWith(
      '/v1/me/offers/offer/view',
      undefined,
      { signal },
    );
  });

  it.each(['accepted', 'rejected'] as const)(
    'sends only the %s decision and returns the server state',
    async (status) => {
      const offer = { id: 'offer', status, respondedAt: '2026-10-09' };
      vi.mocked(clientApi.post).mockResolvedValue({ data: offer });
      await expect(respondToIncomingOffer('offer', status)).resolves.toBe(
        offer,
      );
      expect(clientApi.post).toHaveBeenCalledWith(
        '/v1/me/offers/offer/respond',
        { status },
      );
    },
  );

  it('preserves response conflicts for refreshing the saved decision', async () => {
    const error = new ApiError(409, 'Ответ уже сохранён', 'response_conflict');
    vi.mocked(clientApi.post).mockRejectedValue(error);
    await expect(respondToIncomingOffer('offer', 'rejected')).rejects.toBe(
      error,
    );
  });
});
