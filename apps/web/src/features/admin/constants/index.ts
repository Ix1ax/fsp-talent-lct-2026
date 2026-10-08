import { z } from 'zod';

import { kindSchema } from '@/entities/admin';

import { getAdminPasswordIssue } from '../lib';

const cleanText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'Обязательное поле')
    .max(max, `Максимум ${max} символов`)
    .refine((v) => !v.includes('\0'), 'Недопустимый символ');
export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Введите почту'))
    .refine(
      (v) => new TextEncoder().encode(v).length <= 254,
      'Почта слишком длинная',
    ),
  password: z.string().min(1, 'Введите пароль'),
});
export const accountFormSchema = loginFormSchema.extend({
  password: z.string().superRefine((value, context) => {
    const message = getAdminPasswordIssue(value);
    if (message) context.addIssue({ code: 'custom', message });
  }),
});
export const catalogFormSchema = z.object({
  code: z.string(),
  name: cleanText(200).refine(
    (v) => !/[\u0000-\u001f\u007f]/u.test(v),
    'Недопустимые управляющие символы',
  ),
  rank: z.number().int().min(1).max(32767),
  aliases: z.string(),
});
export const moderationFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v),
      'Недопустимые символы',
    ),
  target_id: z.string(),
});
export const questionFormSchema = z
  .object({
    skill_id: z.string().uuid('Выберите навык'),
    difficulty: z
      .number({ error: 'Введите сложность от 1 до 5' })
      .int('Сложность должна быть целым числом')
      .min(1, 'Сложность — от 1 до 5')
      .max(5, 'Сложность — от 1 до 5'),
    kind: kindSchema,
    text: cleanText(5000),
    code: z.string().max(10000),
    language: z.string().max(32),
    grading: z.enum(['choice', 'text']),
    options: z
      .array(
        z.object({ id: z.string(), text: z.string(), correct: z.boolean() }),
      )
      .max(10),
    multiple: z.boolean(),
    accepted: z.string(),
    case_sensitive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (v.kind === 'code_reading' && (!v.code.trim() || v.code.includes('\0')))
      issue('code', 'Введите код без NUL');
    if (
      (v.kind === 'choice' && v.grading !== 'choice') ||
      (v.kind === 'short_answer' && v.grading !== 'text')
    )
      issue('grading', 'Проверка не соответствует типу задания');
    if (v.grading === 'choice') {
      if (
        v.options.some(
          (o) =>
            !/^[A-Za-z0-9_-]{1,16}$/.test(o.id) ||
            !o.text.trim() ||
            o.text.trim().length > 500 ||
            o.text.includes('\0'),
        )
      )
        issue(
          'options',
          'Укажите уникальные ID (буквы, цифры, _ или -) и текст каждого варианта до 500 символов',
        );
      if (v.options.length < 2) issue('options', 'Нужно 2–10 вариантов');
      if (new Set(v.options.map((o) => o.id)).size !== v.options.length)
        issue('options', 'ID вариантов должны быть уникальны');
      const correct = v.options.filter((o) => o.correct).length;
      if (!correct || (!v.multiple && correct !== 1))
        issue(
          'options',
          'Отметьте правильные ответы: для одиночного выбора нужен ровно один',
        );
    } else {
      const answers = v.accepted
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (
        !answers.length ||
        answers.length > 20 ||
        answers.some((s) => s.length > 200 || s.includes('\0'))
      )
        issue(
          'accepted',
          'Нужно 1–20 ответов до 200 символов, каждый с новой строки',
        );
    }
  });
const decimal = (min: number, max: number) =>
  z
    .number({ error: 'Введите число' })
    .min(min, `Минимальное значение — ${min}`)
    .max(max, `Максимальное значение — ${max}`)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
      'Максимум 2 знака после запятой',
    );
export const templateFormSchema = z
  .object({
    stack_skill_id: z.string().uuid('Выберите основной навык'),
    specialization_id: z
      .number({ error: 'Выберите специализацию' })
      .int()
      .min(1, 'Выберите специализацию')
      .max(32767, 'Выберите специализацию из списка'),
    grade_id: z
      .number({ error: 'Выберите грейд' })
      .int()
      .min(1, 'Выберите грейд')
      .max(32767, 'Выберите грейд из списка'),
    time_limit_sec: z
      .number({ error: 'Введите время в секундах' })
      .int('Время должно быть целым числом')
      .min(300, 'Минимум 300 секунд (5 минут)')
      .max(14400, 'Максимум 14400 секунд (4 часа)'),
    pass_score: decimal(1, 100),
    blueprint: z
      .array(
        z.object({
          skill_id: z.string().uuid('Выберите навык'),
          difficulty: z
            .number({ error: 'Введите сложность от 1 до 5' })
            .int('Сложность должна быть целым числом')
            .min(1, 'Сложность — от 1 до 5')
            .max(5, 'Сложность — от 1 до 5'),
          question_count: z
            .number({ error: 'Введите количество вопросов' })
            .int('Количество должно быть целым числом')
            .min(1, 'Минимум 1 вопрос')
            .max(50, 'Максимум 50 вопросов'),
          weight: decimal(0.01, 100),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((v, ctx) => {
    if (!v.blueprint.some((r) => r.skill_id === v.stack_skill_id))
      ctx.addIssue({
        code: 'custom',
        path: ['blueprint'],
        message: 'Добавьте основной навык в состав теста',
      });
    if (
      new Set(v.blueprint.map((r) => `${r.skill_id}:${r.difficulty}`)).size !==
      v.blueprint.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['blueprint'],
        message: 'Пары навык / сложность должны быть уникальны',
      });
  });
export type QuestionFormValues = z.infer<typeof questionFormSchema>;
export type TemplateFormValues = z.infer<typeof templateFormSchema>;
export const questionContent = (v: QuestionFormValues) => {
  const prompt: {
    text: string;
    code?: string;
    language?: string;
    options?: { id: string; text: string }[];
  } = { text: v.text };
  if (v.kind === 'code_reading') {
    prompt.code = v.code.trim();
    if (v.language.trim()) prompt.language = v.language.trim();
  }
  if (v.grading === 'choice') {
    prompt.options = v.options.map(({ id, text }) => ({
      id,
      text: text.trim(),
    }));
    return {
      prompt,
      grading_spec: {
        type: 'choice' as const,
        correct: v.options.filter((o) => o.correct).map((o) => o.id),
        multiple: v.multiple,
      },
    };
  }
  return {
    prompt,
    grading_spec: {
      type: 'text' as const,
      accepted: v.accepted
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      case_sensitive: v.case_sensitive,
    },
  };
};

export const previewTextAnswerSchema = z.object({
  text: z
    .string()
    .refine((value) => !!value.trim(), 'Введите ответ')
    .refine((value) => Array.from(value).length <= 500, 'Максимум 500 символов')
    .refine((value) => !value.includes('\0'), 'Недопустимый символ'),
});
