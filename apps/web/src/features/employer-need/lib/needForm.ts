import type { NeedInput, NeedStatus } from '@/entities/employer-need';

import { needSchema } from '../constants';

export const emptyNeed = (): NeedInput => ({
  title: '',
  description: '',
  specializationId: 0,
  gradeId: null,
  salaryFromRub: null,
  salaryToRub: null,
  city: null,
  timezone: null,
  skills: [],
  workFormatIds: [],
  status: 'draft',
});
export const validateNeed = (
  input: NeedInput,
  status: NeedStatus,
): Record<string, string> => {
  const result = needSchema.safeParse({ ...input, status });
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
};
/** Белый список тела записи: метаданные ответа не отправляются обратно. */
export const toNeedInput = (need: NeedInput): NeedInput => ({
  title: need.title,
  description: need.description,
  specializationId: need.specializationId,
  gradeId: need.gradeId,
  salaryFromRub: need.salaryFromRub,
  salaryToRub: need.salaryToRub,
  city: need.city,
  timezone: need.timezone,
  status: need.status,
  skills: need.skills.map(({ skillId, required, weight }) => ({
    skillId,
    required,
    weight,
  })),
  workFormatIds: [...need.workFormatIds],
});
export const changedNeedFields = (
  current: NeedInput,
  next: NeedInput,
): Partial<NeedInput> =>
  Object.fromEntries(
    Object.entries(toNeedInput(next)).filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(current[key as keyof NeedInput]),
    ),
  );
