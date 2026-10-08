import { z } from 'zod';

import { EDUCATION_LEVELS } from '@/entities/candidate';

export const EDUCATION_LIMIT = 10;
export const EDUCATION_TEXT_LIMIT = 200;
export const GRADUATION_YEAR_MIN = 1950;
export const GRADUATION_YEAR_MAX = 2100;

const educationText = z
  .string()
  .refine(
    (value) => !value.includes('\0'),
    'Текст содержит недопустимый символ.',
  )
  .refine(
    (value) => Array.from(value.trim()).length <= EDUCATION_TEXT_LIMIT,
    'Не более 200 символов.',
  );

export const educationSchema = z.object({
  level: z
    .enum([...EDUCATION_LEVELS, ''], { error: 'Выберите уровень образования.' })
    .refine((value) => value !== '', 'Выберите уровень образования.'),
  institution: educationText.refine(
    (value) => value.trim().length > 0,
    'Укажите учебное заведение.',
  ),
  specialty: educationText,
  graduationYear: z
    .string()
    .refine(
      (value) =>
        /^\d{4}$/.test(value) &&
        Number(value) >= GRADUATION_YEAR_MIN &&
        Number(value) <= GRADUATION_YEAR_MAX,
      'Укажите год окончания от 1950 до 2100.',
    ),
});
