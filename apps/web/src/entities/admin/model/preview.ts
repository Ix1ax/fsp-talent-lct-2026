import { z } from 'zod';

export const previewAnswerSchema = z.object({
  selected: z.array(z.string()).optional(),
  text: z.string().optional(),
});
const correctAnswerSchema = z.object({
  type: z.enum(['choice', 'text']),
  correct: z.array(z.string()).optional(),
  accepted: z.array(z.string()).optional(),
  multiple: z.boolean().default(false),
  case_sensitive: z.boolean().default(false),
});
export const previewSchema = z.object({
  id: z.string(),
  template_id: z.string(),
  template_version: z.number(),
  status: z.enum(['in_progress', 'submitted', 'expired']),
  started_at: z.string(),
  expires_at: z.string(),
  server_time: z.string(),
  finished_at: z.string().nullable(),
  retain_until: z.string(),
  time_limit_sec: z.number(),
  pass_score: z.number(),
  questions: z.array(
    z.object({
      id: z.string(),
      question_id: z.string(),
      position: z.number(),
      version: z.number(),
      skill_id: z.string(),
      skill_name: z.string(),
      difficulty: z.number(),
      weight: z.number(),
      kind: z.enum(['choice', 'code_reading', 'short_answer']),
      prompt: z.object({
        text: z.string(),
        code: z.string().optional(),
        language: z.string().optional(),
        options: z
          .array(z.object({ id: z.string(), text: z.string() }))
          .optional(),
      }),
      answer_form: z.object({
        type: z.enum(['choice', 'text']),
        multiple: z.boolean(),
      }),
      answer: previewAnswerSchema.nullable(),
    }),
  ),
  result: z
    .object({
      score_percent: z.number(),
      pass_score: z.number(),
      passed: z.boolean(),
      correct_count: z.number(),
      unanswered_count: z.number(),
      question_count: z.number(),
      skills: z.array(z.object({ skill_id: z.string(), percent: z.number() })),
      questions: z.array(
        z.object({
          id: z.string(),
          correct: z.boolean(),
          answered: z.boolean(),
          correct_answer: correctAnswerSchema,
        }),
      ),
    })
    .nullable(),
});
export type Preview = z.infer<typeof previewSchema>;
export type PreviewQuestion = Preview['questions'][number];
export type PreviewAnswer = z.infer<typeof previewAnswerSchema>;
