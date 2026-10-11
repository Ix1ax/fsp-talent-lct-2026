import { pluralizeRu } from '@/shared/utils';

import type { OfferStatus } from '../model';

/** После этого срока предложение без ответа считается «зависшим». */
export const OFFER_STALE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

type OfferTiming = { status: OfferStatus; createdAt: string };

/** Сколько полных дней предложение ждёт ответа; null — ответ уже есть. */
export const getOfferWaitingDays = (
  offer: OfferTiming,
  now: number = Date.now(),
): number | null => {
  if (offer.status !== 'sent' && offer.status !== 'viewed') return null;
  const created = Date.parse(offer.createdAt);
  if (Number.isNaN(created)) return null;
  return Math.max(0, Math.floor((now - created) / DAY_MS));
};

export const isOfferStale = (days: number | null): boolean =>
  days !== null && days >= OFFER_STALE_DAYS;

export const formatOfferWaiting = (days: number): string =>
  days === 0 ? 'меньше дня' : pluralizeRu(days, ['день', 'дня', 'дней']);
