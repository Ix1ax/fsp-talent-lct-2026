import type { NeedInput, NeedStatus } from '@/entities/employer-need';
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
  const errors: Record<string, string> = {};
  if (!input.title.trim() || input.title.trim().length > 200)
    errors.title = 'Укажите название до 200 символов';
  if (!input.description.trim() || input.description.trim().length > 10000)
    errors.description = 'Укажите задачи и описание до 10 000 символов';
  if (!input.specializationId)
    errors.specializationId = 'Выберите специализацию';
  for (const key of ['salaryFromRub', 'salaryToRub'] as const) {
    const v = input[key];
    if (v !== null && (!Number.isSafeInteger(v) || v < 0 || v > 1000000000))
      errors[key] = 'Целая сумма от 0 до 1 000 000 000 ₽';
  }
  if (
    input.salaryFromRub !== null &&
    input.salaryToRub !== null &&
    input.salaryFromRub > input.salaryToRub
  )
    errors.salaryToRub = 'Верхняя граница должна быть не меньше нижней';
  if (input.timezone) {
    try {
      new Intl.DateTimeFormat('ru', { timeZone: input.timezone });
    } catch {
      errors.timezone = 'Выберите часовой пояс IANA';
    }
  }
  if (input.city && input.city.length > 200)
    errors.city = 'Название города до 200 символов';
  if (status === 'active') {
    if (!input.skills.length) errors.skills = 'Добавьте хотя бы один навык';
    if (!input.workFormatIds.length)
      errors.workFormatIds = 'Выберите хотя бы один формат работы';
  }
  if (
    input.skills.some(
      (s) =>
        !Number.isFinite(s.weight) ||
        s.weight < 0.01 ||
        s.weight > 100 ||
        Math.abs(s.weight * 100 - Math.round(s.weight * 100)) > 0.000001,
    )
  )
    errors.skills = 'Вес навыка от 0,01 до 100, до двух знаков после запятой';
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
