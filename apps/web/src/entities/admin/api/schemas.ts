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
export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    limit: z.number(),
    offset: z.number(),
    total: z.number().optional(),
  });

export const adminSchemas = {
  accounts: pageSchema(accountSchema),
  catalogs: pageSchema(catalogSchema),
  questions: pageSchema(questionSchema),
  templates: pageSchema(templateSchema),
  catalog: catalogSchema,
  question: questionSchema,
  template: templateSchema,
  account: accountSchema,
  version: versionSchema,
};

export const moderationSchema = z.object({
  skill: catalogSchema,
  candidate_links: z.number(),
  need_links: z.number(),
  drafted_needs: z.number(),
});
