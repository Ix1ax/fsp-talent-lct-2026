import { z } from 'zod';

export const parseSoftSkills = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

export const surveySchema = z.object({
  stackSkillId: z.string().uuid('Выберите стек из справочника.'),
  industry: z
    .string()
    .trim()
    .min(1, 'Укажите отрасль.')
    .max(200, 'Не более 200 символов.'),
  specializationId: z.number().int().positive('Выберите специализацию.'),
  gradeId: z.number().int().positive('Выберите предполагаемый уровень.'),
  softSkills: z
    .string()
    .refine(
      (value) => parseSoftSkills(value).length <= 20,
      'Не более 20 софт-скиллов.',
    )
    .refine(
      (value) => parseSoftSkills(value).every((item) => item.length <= 100),
      'Каждый софт-скилл — не более 100 символов.',
    )
    .refine(
      (value) =>
        new Set(parseSoftSkills(value)).size === parseSoftSkills(value).length,
      'Уберите повторяющиеся софт-скиллы.',
    ),
});
export type SurveyFormValues = z.infer<typeof surveySchema>;
