import { z } from 'zod';

export const EXPERIENCE_LIMIT = 30;

const monthPattern = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;

export const experienceSchema = z
  .object({
    company: z.string().trim().min(1, 'Укажите компанию.'),
    position: z.string().trim().min(1, 'Укажите должность.'),
    startedOn: z
      .string()
      .regex(monthPattern, 'Укажите месяц начала в формате ГГГГ-ММ.'),
    endedOn: z.string(),
    current: z.boolean(),
    description: z.string(),
  })
  .superRefine((values, context) => {
    if (values.current) return;
    if (!monthPattern.test(values.endedOn)) {
      context.addIssue({
        code: 'custom',
        path: ['endedOn'],
        message: 'Укажите месяц окончания в формате ГГГГ-ММ.',
      });
    } else if (
      monthPattern.test(values.startedOn) &&
      values.endedOn < values.startedOn
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endedOn'],
        message: 'Месяц окончания не может быть раньше месяца начала.',
      });
    }
  });
