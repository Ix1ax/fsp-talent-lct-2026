import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';

import type { NeedsSearchApi } from './types';

export type VacancyFilters = {
  query: string;
  specializationId: number;
  gradeId: number;
  skillId: string;
  workFormatIds: number[];
  sort: 'newest' | 'salary';
};
export const emptyVacancyFilters = (): VacancyFilters => ({
  query: '',
  specializationId: 0,
  gradeId: 0,
  skillId: '',
  workFormatIds: [],
  sort: 'newest',
});
export const hasVacancyFilters = (filters: VacancyFilters) =>
  !!(
    filters.query.trim() ||
    filters.specializationId ||
    filters.gradeId ||
    filters.skillId ||
    filters.workFormatIds.length ||
    filters.sort !== 'newest'
  );

/** Read the complete status before filtering; never filter just a visible page. */
export const loadStatusVacancies = async (
  api: NeedsSearchApi,
  companyId: string,
  status: NeedStatus,
  signal: AbortSignal,
): Promise<EmployerNeed[]> => {
  const items: EmployerNeed[] = [];
  for (let offset = 0; offset <= 10000; offset += 20) {
    signal.throwIfAborted();
    const page = await api.needs(companyId, status, offset, signal);
    items.push(...page.items);
    if (page.hasMore === false || page.items.length < 20) {
      signal.throwIfAborted();
      return items;
    }
  }
  throw new Error(
    'Слишком много потребностей для поиска. Не удалось загрузить полный список.',
  );
};
export const filterVacancyFeed = (
  items: EmployerNeed[],
  filters: VacancyFilters,
): EmployerNeed[] => {
  const query = filters.query.trim().toLocaleLowerCase('ru');
  const result = items.filter(
    (need) =>
      (!query ||
        `${need.title} ${need.description}`
          .toLocaleLowerCase('ru')
          .includes(query)) &&
      (!filters.specializationId ||
        need.specializationId === filters.specializationId) &&
      (!filters.gradeId || need.gradeId === filters.gradeId) &&
      (!filters.skillId ||
        need.skills.some((skill) => skill.skillId === filters.skillId)) &&
      (!filters.workFormatIds.length ||
        need.workFormatIds.some((id) => filters.workFormatIds.includes(id))),
  );
  return result.sort((a, b) => {
    if (filters.sort === 'salary') {
      const salaryA = a.salaryToRub ?? a.salaryFromRub;
      const salaryB = b.salaryToRub ?? b.salaryFromRub;
      if (salaryA === null && salaryB !== null) return 1;
      if (salaryB === null && salaryA !== null) return -1;
      if (salaryA !== null && salaryB !== null && salaryA !== salaryB)
        return salaryB - salaryA;
    }
    return (
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      b.id.localeCompare(a.id)
    );
  });
};
