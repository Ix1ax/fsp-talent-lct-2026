import { clientApi } from '@/shared/api/client';
import type { Page } from '@/shared/api/types';
import type { RecommendationPage } from '@/entities/employer-need';

import type {
  BankCandidate,
  BankCandidateDetails,
  CandidateOffer,
  CandidateOfferContacts,
  OfferStatus,
} from '../model/types';
import type { BankFilters, OfferInput } from './types';

export const bankFilterParams = (filters: BankFilters) => ({
  specializationId: filters.specializationId,
  gradeId: filters.gradeId,
  skillId: filters.skillId || undefined,
  verifiedSkillOnly: filters.skillId ? filters.verifiedSkillOnly : undefined,
  gradeStatus: filters.gradeStatus === 'all' ? undefined : filters.gradeStatus,
  hasFspAchievements: filters.hasFspAchievements,
  workFormatIds: filters.workFormatIds?.length
    ? filters.workFormatIds.join(',')
    : undefined,
  experienceMinMonths: filters.experienceMinMonths,
  experienceMaxMonths: filters.experienceMaxMonths,
  salaryMaxRub: filters.salaryMaxRub,
});
export const validateBankFilters = (filters: BankFilters): string | null => {
  const min = filters.experienceMinMonths;
  const max = filters.experienceMaxMonths;
  for (const value of [min, max])
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 0 || value > 600)
    )
      return 'Укажите опыт от 0 до 50 лет.';
  if (min !== undefined && max !== undefined && min > max)
    return 'Минимальный опыт не должен превышать максимальный.';
  if (
    filters.salaryMaxRub !== undefined &&
    (!Number.isInteger(filters.salaryMaxRub) ||
      filters.salaryMaxRub < 0 ||
      filters.salaryMaxRub > 1000000000)
  )
    return 'Укажите целую зарплату от 0 до 1 000 000 000 ₽.';
  return null;
};
export const getBankCandidates = async (
  companyId: string,
  filters: BankFilters,
  offset = 0,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<Page<BankCandidate> & { total: number }>(
      `/v1/companies/${companyId}/candidates`,
      { params: { ...bankFilterParams(filters), limit: 20, offset }, signal },
    )
  ).data;
export const getBankCandidate = async (
  companyId: string,
  candidateId: string,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<BankCandidateDetails>(
      `/v1/companies/${companyId}/candidates/${candidateId}`,
      { signal },
    )
  ).data;
export const getNeedCandidates = async (
  companyId: string,
  needId: string,
  filters: BankFilters,
  offset = 0,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<RecommendationPage>(
      `/v1/companies/${companyId}/needs/${needId}/candidates`,
      { params: { ...bankFilterParams(filters), limit: 20, offset }, signal },
    )
  ).data;
export const getCompanyOffers = async (
  companyId: string,
  status?: OfferStatus,
  offset = 0,
  signal?: AbortSignal,
) =>
  (
    await clientApi.get<Page<CandidateOffer>>(
      `/v1/companies/${companyId}/offers`,
      { params: { status, limit: 20, offset }, signal },
    )
  ).data;
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
