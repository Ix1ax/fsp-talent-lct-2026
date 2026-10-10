import { ensureClientAccessToken } from '@/shared/api/client';
import { getClientCatalogs, searchCatalogSkills } from '@/entities/catalog';
import { createCompany, getCompanies, updateCompany } from '@/entities/company';
import { companyManagementApi as management } from '@/entities/company';
import {
  getBankCandidate,
  getBankCandidates,
  getCompanyOffer,
  getCompanyOffers,
  getNeedCandidates,
  getOfferContacts,
  sendCandidateOffer,
  viewBankCandidate,
} from '@/entities/employer-bank';
import {
  archiveNeed,
  createNeed,
  getNeed,
  getNeeds,
  getRecommendations,
  updateNeed,
} from '@/entities/employer-need';
export const employerGateway = {
  ...management,
  getBankCandidates,
  getBankCandidate,
  getCompanyOffers,
  getCompanyOffer,
  sendCandidateOffer,
  viewBankCandidate,
  getOfferContacts,
  getNeedCandidates,
  authorize: ensureClientAccessToken,
  catalogs: getClientCatalogs,
  skills: async (q: string, signal?: AbortSignal) =>
    (await searchCatalogSkills(q, 50, 0, signal)).items,
  companies: getCompanies,
  createCompany,
  updateCompany,
  needs: getNeeds,
  need: getNeed,
  createNeed,
  updateNeed,
  archiveNeed,
  recommendations: getRecommendations,
};
export type EmployerGateway = typeof employerGateway;
