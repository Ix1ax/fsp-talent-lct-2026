import { ensureClientAccessToken } from '@/shared/api/client';
import { getClientCatalogs, getClientSkills } from '@/entities/catalog';
import {
  createCompany,
  listCompanies,
  updateCompany,
} from '@/entities/company';
import {
  archiveNeed,
  createNeed,
  getNeed,
  listNeeds,
  listRecommendations,
  updateNeed,
} from '@/entities/employer-need';
export const employerGateway = {
  authorize: ensureClientAccessToken,
  catalogs: getClientCatalogs,
  skills: getClientSkills,
  companies: listCompanies,
  createCompany,
  updateCompany,
  needs: listNeeds,
  need: getNeed,
  createNeed,
  updateNeed,
  archiveNeed,
  recommendations: listRecommendations,
};
export type EmployerGateway = typeof employerGateway;
