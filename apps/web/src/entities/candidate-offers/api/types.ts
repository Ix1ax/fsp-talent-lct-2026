import type { IncomingOffer } from '../model';

export type getIncomingOffersRequest = {
  items: IncomingOffer[];
  total: number;
  limit: number;
  offset: number;
};
