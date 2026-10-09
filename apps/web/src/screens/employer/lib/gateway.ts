import { ensureClientAccessToken } from '@/shared/api/client';
import { getClientCatalogs, getClientSkills } from '@/entities/catalog';
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
  getOfferContacts,
  getNeedCandidates,
  authorize: ensureClientAccessToken,
  catalogs: getClientCatalogs,
  skills: getClientSkills,
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
