import { clientApi } from '@/shared/api/client';

import {
  type IncomingOffer,
  notifyIncomingOffersChanged,
  type OfferDecision,
  type OfferStatus,
} from '../model';
import type { getIncomingOffersRequest } from './types';

export const getIncomingOffers = async (
  status?: OfferStatus,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<getIncomingOffersRequest>(
    '/v1/me/offers',
    {
      params: { status, limit: 20, offset },
      signal,
    },
  );

  return data;
};

export const getIncomingOffer = async (id: string, signal?: AbortSignal) => {
  const { data } = await clientApi.get<IncomingOffer>(`/v1/me/offers/${id}`, {
    signal,
  });

  return data;
};

export const viewIncomingOffer = async (id: string, signal?: AbortSignal) => {
  const { data } = await clientApi.post<IncomingOffer>(
    `/v1/me/offers/${id}/view`,
    undefined,
    {
      signal,
    },
  );

  notifyIncomingOffersChanged();
  return data;
};

export const respondToIncomingOffer = async (
  id: string,
  status: OfferDecision,
) => {
  const { data } = await clientApi.post<IncomingOffer>(
    `/v1/me/offers/${id}/respond`,
    {
      status,
    },
  );

  notifyIncomingOffersChanged();
  return data;
};
