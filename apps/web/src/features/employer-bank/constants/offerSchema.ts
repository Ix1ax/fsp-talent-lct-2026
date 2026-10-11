import { z } from 'zod';

import { contactUrlSchema } from '@/shared/validation/contactUrl';

export const offerSchema = z
  .object({
    candidateId: z.uuid(),
    needId: z.uuid().nullable().optional(),
    title: z.string().trim().min(1, 'Укажите название').max(200),
    description: z
      .string()
      .trim()
      .min(1, 'Укажите условия предложения')
      .max(10000),
    salaryFromRub: z
      .number({ error: 'Укажите зарплату от' })
      .int()
      .min(1, 'Укажите зарплату от 1 ₽')
      .max(1000000000),
    salaryToRub: z
      .number({ error: 'Укажите зарплату до' })
      .int()
      .min(1, 'Укажите зарплату до')
      .max(1000000000),
    contactEmail: z.email('Укажите контактный email').max(254),
    contactUrl: contactUrlSchema.nullable().optional(),
  })
  .refine((input) => input.salaryFromRub <= input.salaryToRub, {
    path: ['salaryToRub'],
    message: 'Верхняя граница должна быть не меньше нижней',
  });
