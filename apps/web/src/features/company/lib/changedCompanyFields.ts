import type { CompanyInput } from '@/entities/company';
/** PATCH изменяет только редактируемые поля, которые пользователь поменял. */
export const changedCompanyFields = (
  current: CompanyInput,
  next: CompanyInput,
): Partial<CompanyInput> => {
  const patch: Partial<CompanyInput> = {};
  for (const key of [
    'name',
    'contactEmail',
    'description',
    'inn',
    'contactUrl',
  ] as const) {
    if (next[key] !== undefined && next[key] !== current[key])
      Object.assign(patch, { [key]: next[key] });
  }
  return patch;
};
