import type {
  getIncomingOffers,
  IncomingOffer,
  OfferStatus,
} from '@/entities/candidate-offers';

type OffersPage = Awaited<ReturnType<typeof getIncomingOffers>>;

export const updateIncomingOffersPage = (
  page: OffersPage,
  offer: IncomingOffer,
  status?: OfferStatus,
): OffersPage => {
  if (!page.items.some((item) => item.id === offer.id)) return page;
  if (status && offer.status !== status) {
    return {
      ...page,
      items: page.items.filter((item) => item.id !== offer.id),
      total: Math.max(0, page.total - 1),
    };
  }

  return {
    ...page,
    items: page.items.map((item) => (item.id === offer.id ? offer : item)),
  };
};
