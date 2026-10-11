import { afterEach, describe, expect, it, vi } from 'vitest';

import { clientApi } from '@/shared/api/client';

import {
  getIncomingOffer,
  respondToIncomingOffer,
  viewIncomingOffer,
} from '../index';

vi.mock('@/shared/api/client', () => ({
  clientApi: { get: vi.fn(), post: vi.fn() },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('offer notification updates', () => {
  it('refreshes unread counts after successful views and responses only', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.mocked(clientApi.get).mockResolvedValue({ data: {} });
    vi.mocked(clientApi.post).mockResolvedValue({ data: {} });
    await getIncomingOffer('offer');
    expect(dispatchEvent).not.toHaveBeenCalled();
    await viewIncomingOffer('offer');
    await respondToIncomingOffer('offer', 'accepted');
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(
      'candidate-offers:changed',
    );
    vi.mocked(clientApi.post).mockRejectedValue(new Error('Unavailable'));
    await expect(viewIncomingOffer('offer')).rejects.toThrow('Unavailable');
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });
});
