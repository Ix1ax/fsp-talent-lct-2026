import type { BankFilters } from './types';

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
