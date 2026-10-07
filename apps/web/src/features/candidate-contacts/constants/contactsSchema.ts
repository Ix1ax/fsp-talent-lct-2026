import { z } from 'zod';

const text = z
  .string()
  .trim()
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    'Уберите управляющие символы.',
  );

export const contactsSchema = z.object({
  fullName: text,
  email: text.refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'Введите корректный email.',
  ),
  phone: text,
  telegram: text,
});
