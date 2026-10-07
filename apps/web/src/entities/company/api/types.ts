import type { createCompany, updateCompany } from './company';

export type CompanyMutationApi = {
  createCompany: typeof createCompany;
  updateCompany: typeof updateCompany;
};
