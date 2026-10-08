import { z } from 'zod';

export const accountSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'superadmin']),
  status: z.enum(['active', 'blocked']),
  created_at: z.string(),
});
export const loginSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_at: z.iso.datetime({ offset: true }),
  admin: accountSchema,
});
export const catalogSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean().optional(),
  rank: z.number().optional(),
  aliases: z.array(z.string()).optional(),
  moderation_status: z
    .enum(['pending', 'approved', 'rejected', 'merged'])
    .optional(),
  submitted_by: z.string().optional(),
  submitted_at: z.string().optional(),
  moderated_by: z.string().optional(),
  moderated_at: z.string().optional(),
  moderation_reason: z.string().optional(),
  merged_into: z.string().optional(),
});
export const catalogKinds = [
  'specializations',
  'skills',
  'grades',
  'work_formats',
] as const;
export type CatalogKind = (typeof catalogKinds)[number];
export type AdminAccount = z.infer<typeof accountSchema>;
export type AdminSession = z.infer<typeof loginSchema>;
export type CatalogItem = z.infer<typeof catalogSchema>;
export const statusSchema = z.enum(['draft', 'published', 'archived']);
export const kindSchema = z.enum(['choice', 'code_reading', 'short_answer']);
export const promptSchema = z.object({
  text: z.string(),
  code: z.string().optional(),
  language: z.string().optional(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
});
export const gradingSchema = z.object({
  type: z.enum(['choice', 'text']),
  correct: z.array(z.string()).optional(),
  multiple: z.boolean().optional(),
  accepted: z.array(z.string()).optional(),
  case_sensitive: z.boolean().optional(),
});
export const versionSchema = z.object({
  version: z.number(),
  status: statusSchema,
  created_at: z.string(),
  published_at: z.string().nullable(),
  prompt: promptSchema,
  grading_spec: gradingSchema,
});
export const questionSchema = z.object({
  id: z.string(),
  skill_id: z.string(),
  skill_name: z.string(),
  difficulty: z.number(),
  kind: kindSchema,
  active: z.boolean(),
  created_at: z.string(),
  latest_version: z.number(),
  published_version: z.number().nullable(),
  versions: z.array(versionSchema).optional(),
});
export const blueprintSchema = z.object({
  skill_id: z.string(),
  difficulty: z.number(),
  question_count: z.number(),
  weight: z.number(),
  skill_name: z.string(),
  available: z.number(),
});
export const templateSchema = z.object({
  id: z.string(),
  stack_skill_id: z.string(),
  stack_name: z.string().nullable(),
  specialization_id: z.number(),
  grade_id: z.number(),
  version: z.number(),
  time_limit_sec: z.number(),
  pass_score: z.number(),
  status: statusSchema,
  created_at: z.string(),
  published_at: z.string().nullable(),
  blueprint: z.array(blueprintSchema).optional(),
});
export const shortageSchema = z.object({
  skill_id: z.string(),
  difficulty: z.number(),
  required: z.number(),
  available: z.number(),
});
export type Shortage = z.infer<typeof shortageSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionVersion = z.infer<typeof versionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type Page<T> = {
  items: T[];
  limit: number;
  offset: number;
  total?: number;
};
export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    limit: z.number(),
    offset: z.number(),
    total: z.number().optional(),
  });
export const catalogLabels: Record<CatalogKind, string> = {
  specializations: 'Специализации',
  skills: 'Навыки',
  grades: 'Грейды',
  work_formats: 'Форматы работы',
};
export const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
  pending: 'На модерации',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  merged: 'Объединён',
  active: 'Активен',
  blocked: 'Заблокирован',
};
export const kindLabels = {
  choice: 'Выбор ответа',
  short_answer: 'Короткий ответ',
  code_reading: 'Чтение кода',
};
