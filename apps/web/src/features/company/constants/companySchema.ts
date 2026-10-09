import { z } from 'zod';

import { contactUrlSchema } from '@/shared/validation/contactUrl';

export const isValidInn = (value: string) => {
  if (!/^\d{10}(\d{2})?$/.test(value) || /^0+$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = (weights: number[]) =>
    (weights.reduce((sum, weight, i) => sum + weight * digits[i], 0) % 11) % 10;
  if (value.length === 10)
    return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[9];
  return (
    check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[10] &&
    check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[11]
  );
};

export const companySchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(200),
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email('Укажите корректный email')),
  description: z.string().trim().max(10000).nullable().optional(),
  inn: z
    .string()
    .trim()
    .refine(
      (value) => !value || isValidInn(value),
      'ИНН должен содержать 10 или 12 цифр с корректной контрольной суммой',
    )
    .nullable()
    .optional(),
  contactUrl: contactUrlSchema.nullable().optional(),
});
export const invitationSchema = z.object({
  email: z.string().trim().max(254).pipe(z.email('Укажите корректный email')),
  role: z.enum(['recruiter', 'viewer']),
});

export const tokenSchema = z.object({
  token: z.string().trim().min(1, 'Укажите токен приглашения'),
});
