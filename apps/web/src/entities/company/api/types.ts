import type { createCompany, updateCompany } from './company';
export interface CompanyMutationApi {
  createCompany: typeof createCompany;
  updateCompany: typeof updateCompany;
}
