import { normalizePage } from '@/shared/api';
import { clientApi } from '@/shared/api/client';
import type { Page } from '@/shared/api/types';

import type {
  CandidateOffer,
  CandidateOfferContacts,
  OfferStatus,
} from '../model';
import type { OfferInput } from './types';

export const getCompanyOffers = async (
  companyId: string,
  status?: OfferStatus,
  offset = 0,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<Page<CandidateOffer>>(
    `/v1/companies/${companyId}/offers`,
    { params: { status, limit: 21, offset }, signal },
  );

  return normalizePage(data);
};
export const getCompanyOffer = async (
  companyId: string,
  id: string,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<CandidateOffer>(
    `/v1/companies/${companyId}/offers/${id}`,
    { signal },
  );

  return data;
};
export const sendCandidateOffer = async (
  companyId: string,
  input: OfferInput,
) => {
  const { data } = await clientApi.post<CandidateOffer>(
    `/v1/companies/${companyId}/offers`,
    input,
  );

  return data;
};
export const getOfferContacts = async (
  companyId: string,
  offerId: string,
  signal?: AbortSignal,
) => {
  const { data } = await clientApi.get<CandidateOfferContacts>(
    `/v1/companies/${companyId}/offers/${offerId}/candidate-contacts`,
    { signal },
  );

  return data;
};
