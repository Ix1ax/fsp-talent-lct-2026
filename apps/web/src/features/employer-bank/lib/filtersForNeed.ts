import { bankFilterParams, type BankFilters } from '@/entities/employer-bank';
import type { EmployerNeed } from '@/entities/employer-need';

/** All skills, location and timezone are scored by the need recommendation endpoint. */
export const filtersForNeed = (need: EmployerNeed): BankFilters => ({
  specializationId: need.specializationId,
  gradeId: need.gradeId ?? undefined,
  salaryMaxRub: need.salaryToRub ?? need.salaryFromRub ?? undefined,
  workFormatIds: [...need.workFormatIds],
});

const comparableFilters = (filters: BankFilters) =>
  JSON.stringify(
    bankFilterParams({
      ...filters,
      workFormatIds: [...new Set(filters.workFormatIds ?? [])].sort(
        (a, b) => a - b,
      ),
    }),
  );

/** Compare effective search criteria, ignoring empty options and format order. */
export const filtersMatchNeed = (filters: BankFilters, need: EmployerNeed) =>
  comparableFilters(filters) === comparableFilters(filtersForNeed(need));
