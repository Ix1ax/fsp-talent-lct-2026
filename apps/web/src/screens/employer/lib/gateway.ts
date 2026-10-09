import { ensureClientAccessToken } from '@/shared/api/client';
import { getClientCatalogs, searchCatalogSkills } from '@/entities/catalog';
import { createCompany, getCompanies, updateCompany } from '@/entities/company';
import {
  archiveNeed,
  createNeed,
  getNeed,
  getNeeds,
  getRecommendations,
  updateNeed,
} from '@/entities/employer-need';
export const employerGateway = {
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
