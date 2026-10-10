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
) =>
  normalizePage(
    (
      await clientApi.get<Page<CandidateOffer>>(
        `/v1/companies/${companyId}/offers`,
        { params: { status, limit: 21, offset }, signal },
      )
    ).data,
  );
export const getCompanyOffer = async (
  companyId: string,
  id: string,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<CandidateOffer>(
      `/v1/companies/${companyId}/offers/${id}`,
      { signal },
    )
  ).data;
export const sendCandidateOffer = async (
  companyId: string,
  input: OfferInput,
) =>
  (
    await clientApi.post<CandidateOffer>(
      `/v1/companies/${companyId}/offers`,
      input,
    )
  ).data;
export const getOfferContacts = async (
  companyId: string,
  offerId: string,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<CandidateOfferContacts>(
      `/v1/companies/${companyId}/offers/${offerId}/candidate-contacts`,
      { signal },
    )
  ).data;
