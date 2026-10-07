import { z } from 'zod';

export const MAX_NEED_SKILLS = 50;

const salarySchema = z
  .number()
  .refine(
    (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000,
    'Целая сумма от 0 до 1 000 000 000 ₽',
  )
  .nullable();

export const needSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Укажите название до 200 символов')
      .max(200, 'Укажите название до 200 символов'),
    description: z
      .string()
      .trim()
      .min(1, 'Укажите задачи и описание до 10 000 символов')
      .max(10000, 'Укажите задачи и описание до 10 000 символов'),
    specializationId: z.number().int().positive('Выберите специализацию'),
    gradeId: z.number().int().positive().nullable(),
    salaryFromRub: salarySchema,
    salaryToRub: salarySchema,
    city: z
      .string()
      .trim()
      .max(200, 'Название города до 200 символов')
      .nullable(),
    timezone: z
      .string()
      .trim()
      .refine((timezone) => {
        if (!timezone) return true;
        if (
          timezone === 'Local' ||
          /^[+-]/.test(timezone) ||
          timezone.includes('\0') ||
          new TextEncoder().encode(timezone).length > 64
        )
          return false;
        try {
          new Intl.DateTimeFormat('ru', { timeZone: timezone });
          return true;
        } catch {
          return false;
        }
      }, 'Выберите часовой пояс IANA')
      .nullable(),
    status: z.enum(['draft', 'active', 'archived']),
    skills: z
      .array(
        z.object({
          skillId: z.string(),
          required: z.boolean(),
          weight: z
            .number()
            .refine(
              (weight) =>
                weight >= 0.01 &&
                weight <= 100 &&
                Math.abs(weight * 100 - Math.round(weight * 100)) <= 0.000001,
              'Вес навыка от 0,01 до 100, до двух знаков после запятой',
            ),
        }),
      )
      .max(MAX_NEED_SKILLS, 'Добавьте не больше 50 навыков'),
    workFormatIds: z
      .array(z.number().int().positive())
      .max(10, 'Выберите не больше 10 форматов работы'),
  })
  .superRefine((input, context) => {
    if (
      input.salaryFromRub !== null &&
      input.salaryToRub !== null &&
      input.salaryFromRub > input.salaryToRub
    ) {
      context.addIssue({
        code: 'custom',
        path: ['salaryToRub'],
        message: 'Верхняя граница должна быть не меньше нижней',
      });
    }
    if (input.status === 'active') {
      if (!input.skills.length)
        context.addIssue({
          code: 'custom',
          path: ['skills'],
          message: 'Добавьте хотя бы один навык',
        });
      if (!input.workFormatIds.length)
        context.addIssue({
          code: 'custom',
          path: ['workFormatIds'],
          message: 'Выберите хотя бы один формат работы',
        });
    }
  });
