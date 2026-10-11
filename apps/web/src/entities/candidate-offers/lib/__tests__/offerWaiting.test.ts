import { describe, expect, it } from 'vitest';

import {
  formatOfferWaiting,
  getOfferWaitingDays,
  isOfferStale,
} from '../offerWaiting';

const now = Date.parse('2026-10-11T12:00:00Z');

describe('offer waiting time', () => {
  it('counts full days only while the offer awaits an answer', () => {
    expect(
      getOfferWaitingDays(
        { status: 'sent', createdAt: '2026-10-08T11:00:00Z' },
        now,
      ),
    ).toBe(3);
    expect(
      getOfferWaitingDays(
        { status: 'viewed', createdAt: '2026-10-11T08:00:00Z' },
        now,
      ),
    ).toBe(0);
    expect(
      getOfferWaitingDays(
        { status: 'accepted', createdAt: '2026-10-01T00:00:00Z' },
        now,
      ),
    ).toBeNull();
    expect(
      getOfferWaitingDays({ status: 'sent', createdAt: 'oops' }, now),
    ).toBeNull();
  });

  it('marks an offer stale after a week without an answer', () => {
    expect(isOfferStale(6)).toBe(false);
    expect(isOfferStale(7)).toBe(true);
    expect(isOfferStale(null)).toBe(false);
  });

  it('formats the waiting time in Russian', () => {
    expect(formatOfferWaiting(0)).toBe('меньше дня');
    expect(formatOfferWaiting(1)).toBe('1 день');
    expect(formatOfferWaiting(3)).toBe('3 дня');
    expect(formatOfferWaiting(9)).toBe('9 дней');
  });
});
