import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .refine((value) => !value.includes('\0'), 'Недопустимый символ.')
    .refine(
      (value) => Array.from(value.trim()).length <= max,
      `Не более ${max} символов.`,
    );

const integerText = (max: number) =>
  z
    .string()
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) <= max,
      `Укажите целое число от 0 до ${max.toLocaleString('ru-RU')}.`,
    );

export const profileSchema = z.object({
  headline: optionalText(200),
  summary: optionalText(10000),
  city: optionalText(200),
  timezone: z.string().refine((value) => {
    const timezone = value.trim();
    if (!timezone) return true;
    if (
      timezone.includes('\0') ||
      new TextEncoder().encode(timezone).length > 64 ||
      timezone === 'Local'
    )
      return false;
    try {
      new Intl.DateTimeFormat('ru', { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Укажите часовой пояс IANA, например Europe/Moscow.'),
  experienceYears: z
    .string()
    .refine(
      (value) => /^\d+(\.\d+)?$/.test(value) && Number(value) <= 50,
      'Укажите опыт от 0 до 50 лет.',
    ),
  salaryMinRub: z.union([z.literal(''), integerText(1_000_000_000)]),
  searchStatus: z.enum(['hidden', 'open', 'passive'], {
    error: 'Выберите статус поиска.',
  }),
  workFormatIds: z
    .array(z.number().int().positive())
    .max(10, 'Выберите до 10 форматов работы.')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Форматы работы не должны повторяться.',
    ),
});
