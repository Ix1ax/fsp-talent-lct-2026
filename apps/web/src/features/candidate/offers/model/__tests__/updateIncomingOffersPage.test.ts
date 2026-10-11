import { expect, it } from 'vitest';

import type { IncomingOffer } from '@/entities/candidate-offers';

import { updateIncomingOffersPage } from '../updateIncomingOffersPage';
const offer = { id: 'A', status: 'sent' } as IncomingOffer;
const other = { id: 'B', status: 'accepted' } as IncomingOffer;
const page = { items: [offer, other], total: 42, limit: 20, offset: 20 };
it('updates the matching row while preserving order, pagination and other rows', () => {
  const updated = { ...offer, status: 'viewed' as const };
  expect(updateIncomingOffersPage(page, updated)).toEqual({
    ...page,
    items: [updated, other],
  });
});
it('removes a changed offer from a status filter and adjusts the count', () => {
  expect(
    updateIncomingOffersPage(page, { ...offer, status: 'accepted' }, 'sent'),
  ).toEqual({ ...page, items: [other], total: 41 });
});
it('does not insert a detail from another page or decrement its total', () => {
  expect(
    updateIncomingOffersPage(
      page,
      { ...offer, id: 'missing', status: 'viewed' },
      'sent',
    ),
  ).toBe(page);
});

it('removes an expired offer from the waiting filter without counting it as a rejection', () => {
  const expired = { ...offer, status: 'expired' as const, respondedAt: null };
  expect(updateIncomingOffersPage(page, expired, 'sent')).toEqual({
    ...page,
    items: [other],
    total: 41,
  });
  expect(updateIncomingOffersPage(page, expired)).toEqual({
    ...page,
    items: [expired, other],
  });
});
